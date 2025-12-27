import "server-only";

import { determineRole } from "@/lib/player-table-data";
import { calculateWinner } from "@/lib/winrate";
import type { HeroName } from "@/types/heroes";
import { cache } from "react";
import type { BaseTeamData } from "./team-shared-data";
import {
  buildCapturesMaps,
  buildFinalRoundMap,
  buildMatchStartMap,
  findTeamNameForMapInMemory,
  getBaseTeamData,
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
