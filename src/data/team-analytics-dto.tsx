import "server-only";

import { determineRole } from "@/lib/player-table-data";
import prisma from "@/lib/prisma";
import { calculateWinner } from "@/lib/winrate";
import type { HeroName } from "@/types/heroes";
import { mapNameToMapTypeMapping } from "@/types/map";
import type { MatchStart, ObjectiveCaptured, RoundEnd } from "@prisma/client";
import { $Enums } from "@prisma/client";
import { cache } from "react";
import { getTeamRoster } from "./team-stats-dto";

export type HeroPickrate = {
  heroName: HeroName;
  role: "Tank" | "Damage" | "Support";
  playtime: number;
  gamesPlayed: number;
};

export type PlayerHeroData = {
  playerName: string;
  heroes: HeroPickrate[];
  totalPlaytime: number;
};

export type HeroPickrateMatrix = {
  players: PlayerHeroData[];
  allHeroes: HeroName[];
};

export type PlayerMapPerformance = {
  playerName: string;
  mapName: string;
  wins: number;
  losses: number;
  winrate: number;
  gamesPlayed: number;
};

export type PlayerMapPerformanceMatrix = {
  players: string[];
  maps: string[];
  performance: PlayerMapPerformance[];
};

type SharedAnalyticsData = {
  teamRoster: string[];
  teamRosterSet: Set<string>;
  mapDataRecords: { id: number; name: string | null }[];
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

function findTeamNameForMapInMemory(
  mapDataId: number,
  allPlayerStats: {
    player_name: string;
    player_team: string;
    MapDataId: number | null;
  }[],
  teamRosterSet: Set<string>
): string | null {
  const teamCounts = new Map<string, number>();

  for (const stat of allPlayerStats) {
    if (stat.MapDataId === mapDataId && teamRosterSet.has(stat.player_name)) {
      const currentCount = teamCounts.get(stat.player_team) ?? 0;
      teamCounts.set(stat.player_team, currentCount + 1);
    }
  }

  let maxCount = 0;
  let teamName: string | null = null;

  for (const [team, count] of teamCounts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      teamName = team;
    }
  }

  return teamName;
}

async function getSharedAnalyticsDataUncached(
  teamId: number
): Promise<SharedAnalyticsData | null> {
  const teamRoster = await getTeamRoster(teamId);
  const teamRosterSet = new Set(teamRoster);

  if (teamRoster.length === 0) {
    return null;
  }

  const allMapDataRecords = await prisma.map.findMany({
    where: { Scrim: { Team: { id: teamId } } },
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
    return null;
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
    teamRosterSet,
    mapDataRecords,
    allPlayerStats,
    matchStarts,
    finalRounds,
    captures,
  };
}

const getSharedAnalyticsData = cache(getSharedAnalyticsDataUncached);

async function getHeroPickrateMatrixUncached(
  teamId: number
): Promise<HeroPickrateMatrix> {
  const sharedData = await getSharedAnalyticsData(teamId);

  if (!sharedData) {
    return {
      players: [],
      allHeroes: [],
    };
  }

  const { teamRosterSet, mapDataRecords, allPlayerStats } = sharedData;

  // Build player hero data
  const playerHeroMap = new Map<
    string,
    Map<HeroName, { playtime: number; games: Set<number> }>
  >();
  const allHeroesSet = new Set<HeroName>();

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

    for (const stat of playersOnMap) {
      const playerName = stat.player_name;
      const heroName = stat.player_hero as HeroName;

      if (!playerHeroMap.has(playerName)) {
        playerHeroMap.set(playerName, new Map());
      }

      const playerHeroes = playerHeroMap.get(playerName)!;
      if (!playerHeroes.has(heroName)) {
        playerHeroes.set(heroName, { playtime: 0, games: new Set() });
      }

      const heroData = playerHeroes.get(heroName)!;
      heroData.playtime += stat.hero_time_played;
      heroData.games.add(mapDataId);

      allHeroesSet.add(heroName);
    }
  }

  const players: PlayerHeroData[] = [];

  for (const [playerName, heroesMap] of playerHeroMap.entries()) {
    let totalPlaytime = 0;
    const heroes: HeroPickrate[] = [];

    for (const [heroName, data] of heroesMap.entries()) {
      const role = determineRole(heroName);
      if (role !== "Tank" && role !== "Damage" && role !== "Support") continue;

      totalPlaytime += data.playtime;
      heroes.push({
        heroName,
        role,
        playtime: data.playtime,
        gamesPlayed: data.games.size,
      });
    }

    // Sort by playtime descending
    heroes.sort((a, b) => b.playtime - a.playtime);

    players.push({
      playerName,
      heroes,
      totalPlaytime,
    });
  }

  // Sort players by total playtime
  players.sort((a, b) => b.totalPlaytime - a.totalPlaytime);

  return {
    players,
    allHeroes: Array.from(allHeroesSet),
  };
}

export const getHeroPickrateMatrix = cache(getHeroPickrateMatrixUncached);

async function getPlayerMapPerformanceMatrixUncached(
  teamId: number
): Promise<PlayerMapPerformanceMatrix> {
  const sharedData = await getSharedAnalyticsData(teamId);

  if (!sharedData) {
    return {
      players: [],
      maps: [],
      performance: [],
    };
  }

  const {
    teamRosterSet,
    mapDataRecords,
    allPlayerStats,
    matchStarts,
    finalRounds,
    captures,
  } = sharedData;

  // Build lookup maps
  const finalRoundMap = new Map<number, (typeof finalRounds)[0]>();
  for (const round of finalRounds) {
    const mapDataId = round.MapDataId;
    if (mapDataId) {
      const existing = finalRoundMap.get(mapDataId);
      if (!existing || round.round_number > existing.round_number) {
        finalRoundMap.set(mapDataId, round);
      }
    }
  }

  const matchStartMap = new Map<number, (typeof matchStarts)[0]>();
  for (const match of matchStarts) {
    if (match.MapDataId) {
      matchStartMap.set(match.MapDataId, match);
    }
  }

  const team1CapturesMap = new Map<number, typeof captures>();
  const team2CapturesMap = new Map<number, typeof captures>();

  for (const capture of captures) {
    const mapDataId = capture.MapDataId;
    if (!mapDataId) continue;

    const match = matchStartMap.get(mapDataId);
    if (!match) continue;

    if (capture.capturing_team === match.team_1_name) {
      if (!team1CapturesMap.has(mapDataId)) {
        team1CapturesMap.set(mapDataId, []);
      }
      team1CapturesMap.get(mapDataId)!.push(capture);
    } else if (capture.capturing_team === match.team_2_name) {
      if (!team2CapturesMap.has(mapDataId)) {
        team2CapturesMap.set(mapDataId, []);
      }
      team2CapturesMap.get(mapDataId)!.push(capture);
    }
  }

  // Calculate player performance per map
  type MapData = {
    players: Set<string>;
    wins: number;
    losses: number;
  };

  const playerMapStats = new Map<string, Map<string, MapData>>();

  for (const mapDataRecord of mapDataRecords) {
    const mapDataId = mapDataRecord.id;
    const mapName = mapDataRecord.name;
    if (!mapName) continue;

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
      const playerName = stat.player_name;

      if (!playerMapStats.has(playerName)) {
        playerMapStats.set(playerName, new Map());
      }

      const playerMaps = playerMapStats.get(playerName)!;
      if (!playerMaps.has(mapName)) {
        playerMaps.set(mapName, {
          players: new Set(),
          wins: 0,
          losses: 0,
        });
      }

      const mapData = playerMaps.get(mapName)!;
      mapData.players.add(playerName);
      if (isWin) {
        mapData.wins++;
      } else {
        mapData.losses++;
      }
    }
  }

  const performance: PlayerMapPerformance[] = [];
  const uniquePlayers = new Set<string>();
  const uniqueMaps = new Set<string>();

  for (const [playerName, mapsData] of playerMapStats.entries()) {
    uniquePlayers.add(playerName);

    for (const [mapName, data] of mapsData.entries()) {
      uniqueMaps.add(mapName);
      const gamesPlayed = data.wins + data.losses;
      const winrate = gamesPlayed > 0 ? (data.wins / gamesPlayed) * 100 : 0;

      performance.push({
        playerName,
        mapName,
        wins: data.wins,
        losses: data.losses,
        winrate,
        gamesPlayed,
      });
    }
  }

  return {
    players: Array.from(uniquePlayers).sort(),
    maps: Array.from(uniqueMaps).sort(),
    performance,
  };
}

export const getPlayerMapPerformanceMatrix = cache(
  getPlayerMapPerformanceMatrixUncached
);
