import "server-only";

import { determineRole } from "@/lib/player-table-data";
import prisma from "@/lib/prisma";
import { calculateWinner } from "@/lib/winrate";
import type { HeroName } from "@/types/heroes";
import { mapNameToMapTypeMapping } from "@/types/map";
import type { MatchStart, ObjectiveCaptured, RoundEnd } from "@prisma/client";
import { $Enums } from "@prisma/client";
import { cache } from "react";
import type { BaseTeamData } from "./team-shared-data";
import {
  buildCapturesMaps,
  buildFinalRoundMap,
  buildMatchStartMap,
  findTeamNameForMapInMemory,
  getBaseTeamData,
  getTeamRoster,
} from "./team-shared-data";

export type HeroPlaytime = {
  heroName: HeroName;
  role: "Tank" | "Damage" | "Support";
  totalPlaytime: number;
  gamesPlayed: number;
  playedBy: string[];
};

export type HeroWinrate = {
  heroName: HeroName;
  role: "Tank" | "Damage" | "Support";
  wins: number;
  losses: number;
  winrate: number;
  gamesPlayed: number;
  totalPlaytime: number;
};

export type HeroSpecialist = {
  playerName: string;
  heroName: HeroName;
  role: "Tank" | "Damage" | "Support";
  playtime: number;
  gamesPlayed: number;
  ownershipPercentage: number;
};

export type HeroDiversity = {
  totalUniqueHeroes: number;
  heroesPerRole: {
    Tank: number;
    Damage: number;
    Support: number;
  };
  diversityScore: number;
  effectiveHeroPool: number;
};

export type HeroPoolAnalysis = {
  mostPlayedByRole: {
    Tank: HeroPlaytime[];
    Damage: HeroPlaytime[];
    Support: HeroPlaytime[];
  };
  topHeroWinrates: HeroWinrate[];
  specialists: HeroSpecialist[];
  diversity: HeroDiversity;
};

export type HeroPoolRawData = {
  teamRoster: string[];
  mapDataRecords: {
    id: number;
    name: string | null;
    scrimDate: Date;
  }[];
  allPlayerStats: {
    player_name: string;
    player_team: string;
    player_hero: string;
    hero_time_played: number;
    MapDataId: number | null;
  }[];
  matchStarts: MatchStart[];
  finalRounds: RoundEnd[];
  captures: ObjectiveCaptured[];
};

async function getHeroPoolAnalysisUncached(
  teamId: number,
  dateFrom?: Date,
  dateTo?: Date
): Promise<HeroPoolAnalysis> {
  // Special handling for date range filtering - need custom query
  if (dateFrom && dateTo) {
    return getHeroPoolAnalysisWithCustomDateRange(teamId, dateFrom, dateTo);
  }

  // Use shared data layer
  const sharedData = await getBaseTeamData(teamId, {
    excludePush: true,
    excludeClash: true,
  });

  return processHeroPoolAnalysis(sharedData);
}

async function getHeroPoolAnalysisWithCustomDateRange(
  teamId: number,
  dateFrom: Date,
  dateTo: Date
): Promise<HeroPoolAnalysis> {
  const teamRoster = await getTeamRoster(teamId);
  const teamRosterSet = new Set(teamRoster);

  if (teamRoster.length === 0) {
    return createEmptyHeroPoolAnalysis();
  }

  const dateFilter = {
    date: {
      gte: dateFrom,
      lte: dateTo,
    },
  };

  const allMapDataRecords = await prisma.map.findMany({
    where: {
      Scrim: {
        Team: { id: teamId },
        ...dateFilter,
      },
    },
    select: {
      id: true,
      name: true,
    },
  });

  const mapDataRecords = allMapDataRecords.filter((record) => {
    const mapName = record.name;
    if (!mapName) return false;
    const mapType =
      mapNameToMapTypeMapping[mapName as keyof typeof mapNameToMapTypeMapping];
    return mapType !== $Enums.MapType.Push && mapType !== $Enums.MapType.Clash;
  });

  if (mapDataRecords.length === 0) {
    return createEmptyHeroPoolAnalysis();
  }

  const mapDataIds = mapDataRecords.map((md) => md.id);

  const [allPlayerStats, matchStarts, finalRounds, captures] =
    await Promise.all([
      prisma.playerStat.findMany({
        where: { MapDataId: { in: mapDataIds } },
        select: {
          player_name: true,
          player_team: true,
          player_hero: true,
          hero_time_played: true,
          MapDataId: true,
          eliminations: true,
          final_blows: true,
          deaths: true,
          offensive_assists: true,
          hero_damage_dealt: true,
          damage_taken: true,
          healing_dealt: true,
          ultimates_earned: true,
          ultimates_used: true,
        },
      }),
      prisma.matchStart.findMany({
        where: { MapDataId: { in: mapDataIds } },
      }),
      prisma.roundEnd.findMany({
        where: {
          MapDataId: { in: mapDataIds },
        },
        orderBy: { round_number: "desc" },
      }),
      prisma.objectiveCaptured.findMany({
        where: { MapDataId: { in: mapDataIds } },
      }),
    ]);

  const baseData: BaseTeamData = {
    teamId,
    teamRoster,
    teamRosterSet,
    mapDataRecords,
    mapDataIds,
    allPlayerStats,
    matchStarts,
    finalRounds,
    captures,
  };

  return processHeroPoolAnalysis(baseData);
}

function processHeroPoolAnalysis(sharedData: BaseTeamData): HeroPoolAnalysis {
  const {
    teamRosterSet,
    mapDataRecords,
    allPlayerStats,
    matchStarts,
    finalRounds,
    captures,
  } = sharedData;

  if (mapDataRecords.length === 0) {
    return createEmptyHeroPoolAnalysis();
  }

  const finalRoundMap = buildFinalRoundMap(finalRounds);
  const matchStartMap = buildMatchStartMap(matchStarts);
  const { team1CapturesMap, team2CapturesMap } = buildCapturesMaps(
    captures,
    matchStartMap
  );

  type HeroData = {
    playtime: number;
    gamesPlayed: Set<number>;
    playedBy: Set<string>;
    wins: number;
    losses: number;
  };

  type PlayerHeroData = {
    playtime: number;
    gamesPlayed: Set<number>;
  };

  const heroDataMap = new Map<HeroName, HeroData>();
  const playerHeroMap = new Map<string, Map<HeroName, PlayerHeroData>>();

  for (const mapDataRecord of mapDataRecords) {
    const mapDataId = mapDataRecord.id;

    const teamName = findTeamNameForMapInMemory(
      mapDataId,
      allPlayerStats,
      teamRosterSet
    );
    if (!teamName) continue;

    const playersOnMap = allPlayerStats.filter(
      (stat) => stat.MapDataId === mapDataId && stat.player_team === teamName
    );

    if (!playersOnMap.every((p) => teamRosterSet.has(p.player_name))) continue;

    const matchDetails = matchStartMap.get(mapDataId) ?? null;
    const finalRound = finalRoundMap.get(mapDataId) ?? null;
    const winner = calculateWinner({
      matchDetails,
      finalRound,
      team1Captures: team1CapturesMap.get(mapDataId) ?? [],
      team2Captures: team2CapturesMap.get(mapDataId) ?? [],
    });

    const isWin = winner === teamName;

    for (const stat of playersOnMap) {
      const heroName = stat.player_hero as HeroName;
      const playerName = stat.player_name;

      if (!heroDataMap.has(heroName)) {
        heroDataMap.set(heroName, {
          playtime: 0,
          gamesPlayed: new Set(),
          playedBy: new Set(),
          wins: 0,
          losses: 0,
        });
      }

      const heroData = heroDataMap.get(heroName)!;
      heroData.playtime += stat.hero_time_played;
      heroData.gamesPlayed.add(mapDataId);
      heroData.playedBy.add(playerName);

      if (isWin) {
        heroData.wins++;
      } else {
        heroData.losses++;
      }

      if (!playerHeroMap.has(playerName)) {
        playerHeroMap.set(playerName, new Map());
      }

      const playerHeroes = playerHeroMap.get(playerName)!;
      if (!playerHeroes.has(heroName)) {
        playerHeroes.set(heroName, {
          playtime: 0,
          gamesPlayed: new Set(),
        });
      }

      const playerHeroData = playerHeroes.get(heroName)!;
      playerHeroData.playtime += stat.hero_time_played;
      playerHeroData.gamesPlayed.add(mapDataId);
    }
  }

  const mostPlayedByRole: HeroPoolAnalysis["mostPlayedByRole"] = {
    Tank: [],
    Damage: [],
    Support: [],
  };

  const allHeroWinrates: HeroWinrate[] = [];

  for (const [heroName, data] of heroDataMap.entries()) {
    const role = determineRole(heroName);
    if (role !== "Tank" && role !== "Damage" && role !== "Support") continue;

    const heroPlaytime: HeroPlaytime = {
      heroName,
      role,
      totalPlaytime: data.playtime,
      gamesPlayed: data.gamesPlayed.size,
      playedBy: Array.from(data.playedBy),
    };

    mostPlayedByRole[role].push(heroPlaytime);

    const gamesPlayed = data.wins + data.losses;
    if (gamesPlayed > 0) {
      allHeroWinrates.push({
        heroName,
        role,
        wins: data.wins,
        losses: data.losses,
        winrate: (data.wins / gamesPlayed) * 100,
        gamesPlayed,
        totalPlaytime: data.playtime,
      });
    }
  }

  mostPlayedByRole.Tank.sort((a, b) => b.totalPlaytime - a.totalPlaytime);
  mostPlayedByRole.Damage.sort((a, b) => b.totalPlaytime - a.totalPlaytime);
  mostPlayedByRole.Support.sort((a, b) => b.totalPlaytime - a.totalPlaytime);

  const topHeroWinrates = allHeroWinrates
    .filter((h) => h.gamesPlayed >= 3)
    .sort((a, b) => b.winrate - a.winrate)
    .slice(0, 10);

  const specialists: HeroSpecialist[] = [];

  for (const [playerName, heroesMap] of playerHeroMap.entries()) {
    for (const [heroName, data] of heroesMap.entries()) {
      const role = determineRole(heroName);
      if (role !== "Tank" && role !== "Damage" && role !== "Support") continue;

      const totalHeroPlaytime = heroDataMap.get(heroName)?.playtime ?? 0;
      const ownershipPercentage =
        totalHeroPlaytime > 0 ? (data.playtime / totalHeroPlaytime) * 100 : 0;

      if (ownershipPercentage >= 30) {
        specialists.push({
          playerName,
          heroName,
          role,
          playtime: data.playtime,
          gamesPlayed: data.gamesPlayed.size,
          ownershipPercentage,
        });
      }
    }
  }

  specialists.sort((a, b) => b.ownershipPercentage - a.ownershipPercentage);

  const uniqueHeroes = heroDataMap.size;
  const heroesPerRole = {
    Tank: mostPlayedByRole.Tank.length,
    Damage: mostPlayedByRole.Damage.length,
    Support: mostPlayedByRole.Support.length,
  };

  const effectiveHeroPool = Array.from(heroDataMap.values()).filter(
    (data) => data.gamesPlayed.size >= 3
  ).length;

  const maxHeroes = 41;
  const diversityScore = Math.min((uniqueHeroes / maxHeroes) * 100, 100);

  const diversity: HeroDiversity = {
    totalUniqueHeroes: uniqueHeroes,
    heroesPerRole,
    diversityScore,
    effectiveHeroPool,
  };

  return {
    mostPlayedByRole,
    topHeroWinrates,
    specialists,
    diversity,
  };
}

function createEmptyHeroPoolAnalysis(): HeroPoolAnalysis {
  return {
    mostPlayedByRole: {
      Tank: [],
      Damage: [],
      Support: [],
    },
    topHeroWinrates: [],
    specialists: [],
    diversity: {
      totalUniqueHeroes: 0,
      heroesPerRole: {
        Tank: 0,
        Damage: 0,
        Support: 0,
      },
      diversityScore: 0,
      effectiveHeroPool: 0,
    },
  };
}

export const getHeroPoolAnalysis = cache(getHeroPoolAnalysisUncached);

export async function getHeroPoolAnalysisWithDateRange(
  teamId: number,
  dateFrom?: Date,
  dateTo?: Date
): Promise<HeroPoolAnalysis> {
  return getHeroPoolAnalysisUncached(teamId, dateFrom, dateTo);
}

async function getHeroPoolRawDataUncached(
  teamId: number
): Promise<HeroPoolRawData> {
  // Fetch with date info for raw data
  const allMapDataRecords = await prisma.map.findMany({
    where: {
      Scrim: {
        Team: { id: teamId },
      },
    },
    select: {
      id: true,
      name: true,
      Scrim: {
        select: {
          date: true,
        },
      },
    },
  });

  const teamRoster = await getTeamRoster(teamId);

  if (teamRoster.length === 0) {
    return {
      teamRoster: [],
      mapDataRecords: [],
      allPlayerStats: [],
      matchStarts: [],
      finalRounds: [],
      captures: [],
    };
  }

  const mapDataRecords = allMapDataRecords
    .filter((record) => {
      const mapName = record.name;
      if (!mapName) return false;
      const mapType =
        mapNameToMapTypeMapping[
          mapName as keyof typeof mapNameToMapTypeMapping
        ];
      return (
        mapType !== $Enums.MapType.Push && mapType !== $Enums.MapType.Clash
      );
    })
    .map((record) => ({
      id: record.id,
      name: record.name,
      scrimDate: record.Scrim?.date ?? new Date(),
    }));

  if (mapDataRecords.length === 0) {
    return {
      teamRoster,
      mapDataRecords: [],
      allPlayerStats: [],
      matchStarts: [],
      finalRounds: [],
      captures: [],
    };
  }

  const mapDataIds = mapDataRecords.map((md) => md.id);

  const [allPlayerStats, matchStarts, finalRounds, captures] =
    await Promise.all([
      prisma.playerStat.findMany({
        where: { MapDataId: { in: mapDataIds } },
        select: {
          player_name: true,
          player_team: true,
          player_hero: true,
          hero_time_played: true,
          MapDataId: true,
        },
      }),
      prisma.matchStart.findMany({
        where: { MapDataId: { in: mapDataIds } },
      }),
      prisma.roundEnd.findMany({
        where: {
          MapDataId: { in: mapDataIds },
        },
        orderBy: { round_number: "desc" },
      }),
      prisma.objectiveCaptured.findMany({
        where: { MapDataId: { in: mapDataIds } },
      }),
    ]);

  return {
    teamRoster,
    mapDataRecords,
    allPlayerStats,
    matchStarts,
    finalRounds,
    captures,
  };
}

export const getHeroPoolRawData = cache(getHeroPoolRawDataUncached);
