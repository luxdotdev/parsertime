import "server-only";

import { determineRole } from "@/lib/player-table-data";
import prisma from "@/lib/prisma";
import { calculateWinner } from "@/lib/winrate";
import type { HeroName } from "@/types/heroes";
import { mapNameToMapTypeMapping } from "@/types/map";
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

export type HeroPickrateRawData = {
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

// Deprecated - use getBaseTeamData from team-shared-data instead
async function getSharedAnalyticsDataUncached(
  teamId: number
): Promise<BaseTeamData | null> {
  const sharedData = await getBaseTeamData(teamId, {
    excludePush: true,
    excludeClash: true,
  });

  if (sharedData.mapDataRecords.length === 0) {
    return null;
  }

  return sharedData;
}

const getSharedAnalyticsData = cache(getSharedAnalyticsDataUncached);

async function getHeroPickrateMatrixUncached(
  teamId: number,
  dateFrom?: Date,
  dateTo?: Date
): Promise<HeroPickrateMatrix> {
  // Special handling for date range filtering - need custom query
  if (dateFrom && dateTo) {
    return getHeroPickrateMatrixWithDateRange(teamId, dateFrom, dateTo);
  }

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

async function getHeroPickrateMatrixWithDateRange(
  teamId: number,
  dateFrom: Date,
  dateTo: Date
): Promise<HeroPickrateMatrix> {
  const teamRoster = await getTeamRoster(teamId);
  const teamRosterSet = new Set(teamRoster);

  if (teamRoster.length === 0) {
    return {
      players: [],
      allHeroes: [],
    };
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
    return {
      players: [],
      allHeroes: [],
    };
  }

  const mapDataIds = mapDataRecords.map((md) => md.id);

  const allPlayerStats = await prisma.playerStat.findMany({
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
  });

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
  const finalRoundMap = buildFinalRoundMap(finalRounds);
  const matchStartMap = buildMatchStartMap(matchStarts);

  const { team1CapturesMap, team2CapturesMap } = buildCapturesMaps(
    captures,
    matchStartMap
  );

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

    // Get unique players on this map to avoid counting the same player multiple times
    // (since players can have multiple entries for different heroes)
    const uniquePlayersOnMap = new Set<string>();
    for (const stat of playersOnMap) {
      uniquePlayersOnMap.add(stat.player_name);
    }

    // Now count each player only once per map
    for (const playerName of uniquePlayersOnMap) {
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

async function getHeroPickrateRawDataUncached(
  teamId: number
): Promise<HeroPickrateRawData> {
  const teamRoster = await getTeamRoster(teamId);

  if (teamRoster.length === 0) {
    return {
      teamRoster: [],
      mapDataRecords: [],
      allPlayerStats: [],
    };
  }

  const allMapDataRecords = await prisma.map.findMany({
    where: { Scrim: { Team: { id: teamId } } },
    select: {
      id: true,
      name: true,
      Scrim: {
        select: {
          date: true,
        },
      },
    },
    orderBy: {
      Scrim: {
        date: "desc",
      },
    },
  });

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
    };
  }

  const mapDataIds = mapDataRecords.map((md) => md.id);

  const allPlayerStats = await prisma.playerStat.findMany({
    where: { MapDataId: { in: mapDataIds } },
    select: {
      player_name: true,
      player_team: true,
      player_hero: true,
      hero_time_played: true,
      MapDataId: true,
    },
  });

  return {
    teamRoster,
    mapDataRecords,
    allPlayerStats,
  };
}

export const getHeroPickrateRawData = cache(getHeroPickrateRawDataUncached);
