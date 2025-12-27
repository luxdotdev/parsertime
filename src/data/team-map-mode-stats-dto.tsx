import "server-only";

import prisma from "@/lib/prisma";
import { calculateWinner } from "@/lib/winrate";
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
} from "./team-shared-data";

export type MapModeStats = {
  mapType: $Enums.MapType;
  wins: number;
  losses: number;
  winrate: number;
  gamesPlayed: number;
  avgPlaytime: number;
  bestMap: {
    name: string;
    winrate: number;
  } | null;
  worstMap: {
    name: string;
    winrate: number;
  } | null;
};

export type MapModePerformance = {
  overall: {
    totalGames: number;
    totalWins: number;
    totalLosses: number;
    overallWinrate: number;
  };
  byMode: Record<$Enums.MapType, MapModeStats>;
  bestMode: $Enums.MapType | null;
  worstMode: $Enums.MapType | null;
};

async function getMapModePerformanceUncached(
  teamId: number
): Promise<MapModePerformance> {
  const sharedData = await getBaseTeamData(teamId);
  return await processMapModePerformance(sharedData);
}

async function processMapModePerformance(
  sharedData: BaseTeamData
): Promise<MapModePerformance> {
  const { mapDataRecords: allMapDataRecords } = sharedData;

  if (allMapDataRecords.length === 0) {
    return createEmptyMapModePerformance();
  }

  // Need match end data for playtime
  const mapDataIds = allMapDataRecords.map((md) => md.id);

  return processMapModePerformanceWithMatchEnds(
    sharedData,
    allMapDataRecords,
    mapDataIds
  );
}

async function processMapModePerformanceWithMatchEnds(
  sharedData: BaseTeamData,
  allMapDataRecords: BaseTeamData["mapDataRecords"],
  mapDataIds: number[]
): Promise<MapModePerformance> {
  const { teamRosterSet, allPlayerStats, matchStarts, finalRounds, captures } =
    sharedData;

  // Fetch match ends for playtime data
  const matchEnds = await prisma.matchEnd.findMany({
    where: { MapDataId: { in: mapDataIds } },
    select: {
      match_time: true,
      MapDataId: true,
    },
  });

  const finalRoundMap = buildFinalRoundMap(finalRounds);
  const matchStartMap = buildMatchStartMap(matchStarts);

  const matchEndMap = new Map<number, number>();
  for (const match of matchEnds) {
    if (match.MapDataId) {
      matchEndMap.set(match.MapDataId, match.match_time);
    }
  }

  const { team1CapturesMap, team2CapturesMap } = buildCapturesMaps(
    captures,
    matchStartMap
  );

  type MapModeData = {
    wins: number;
    losses: number;
    totalPlaytime: number;
    mapWinrates: Map<string, { wins: number; losses: number }>;
  };

  const modeData = new Map<$Enums.MapType, MapModeData>();

  // Only initialize modes that are actually playable competitively
  const activeModes = [
    $Enums.MapType.Control,
    $Enums.MapType.Hybrid,
    $Enums.MapType.Escort,
    $Enums.MapType.Flashpoint,
  ];

  for (const mapType of activeModes) {
    modeData.set(mapType, {
      wins: 0,
      losses: 0,
      totalPlaytime: 0,
      mapWinrates: new Map(),
    });
  }

  let totalGames = 0;
  let totalWins = 0;
  let totalLosses = 0;

  for (const mapDataRecord of allMapDataRecords) {
    const mapDataId = mapDataRecord.id;
    const mapName = mapDataRecord.name;

    if (!mapName) continue;

    const mapType =
      mapNameToMapTypeMapping[mapName as keyof typeof mapNameToMapTypeMapping];
    if (!mapType) continue;

    // Skip Push (can't be calculated) and Clash (no longer played competitively)
    if (mapType === $Enums.MapType.Push || mapType === $Enums.MapType.Clash) {
      continue;
    }

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
    const playtime = matchEndMap.get(mapDataId) ?? 0;

    const data = modeData.get(mapType)!;
    if (isWin) {
      data.wins++;
      totalWins++;
    } else {
      data.losses++;
      totalLosses++;
    }
    data.totalPlaytime += playtime;
    totalGames++;

    if (!data.mapWinrates.has(mapName)) {
      data.mapWinrates.set(mapName, { wins: 0, losses: 0 });
    }
    const mapWinrate = data.mapWinrates.get(mapName)!;
    if (isWin) {
      mapWinrate.wins++;
    } else {
      mapWinrate.losses++;
    }
  }

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const byMode: Record<$Enums.MapType, MapModeStats> = {} as Record<
    $Enums.MapType,
    MapModeStats
  >;
  let bestMode: $Enums.MapType | null = null;
  let bestWinrate = -1;
  let worstMode: $Enums.MapType | null = null;
  let worstWinrate = 101;

  for (const [mapType, data] of modeData.entries()) {
    const gamesPlayed = data.wins + data.losses;
    const winrate = gamesPlayed > 0 ? (data.wins / gamesPlayed) * 100 : 0;
    const avgPlaytime = gamesPlayed > 0 ? data.totalPlaytime / gamesPlayed : 0;

    let bestMap: MapModeStats["bestMap"] = null;
    let worstMap: MapModeStats["worstMap"] = null;

    if (data.mapWinrates.size > 0) {
      let bestMapWinrate = -1;
      let worstMapWinrate = 101;

      for (const [mapName, mapData] of data.mapWinrates.entries()) {
        const mapGames = mapData.wins + mapData.losses;
        if (mapGames === 0) continue;

        const mapWinrate = (mapData.wins / mapGames) * 100;

        if (mapWinrate > bestMapWinrate) {
          bestMapWinrate = mapWinrate;
          bestMap = { name: mapName, winrate: mapWinrate };
        }

        if (mapWinrate < worstMapWinrate) {
          worstMapWinrate = mapWinrate;
          worstMap = { name: mapName, winrate: mapWinrate };
        }
      }
    }

    byMode[mapType] = {
      mapType,
      wins: data.wins,
      losses: data.losses,
      winrate,
      gamesPlayed,
      avgPlaytime,
      bestMap,
      worstMap,
    };

    if (gamesPlayed >= 3) {
      if (winrate > bestWinrate) {
        bestWinrate = winrate;
        bestMode = mapType;
      }
      if (winrate < worstWinrate) {
        worstWinrate = winrate;
        worstMode = mapType;
      }
    }
  }

  const overallWinrate = totalGames > 0 ? (totalWins / totalGames) * 100 : 0;

  return {
    overall: {
      totalGames,
      totalWins,
      totalLosses,
      overallWinrate,
    },
    byMode,
    bestMode,
    worstMode,
  };
}

function createEmptyMapModePerformance(): MapModePerformance {
  const emptyStats: MapModeStats = {
    mapType: $Enums.MapType.Control,
    wins: 0,
    losses: 0,
    winrate: 0,
    gamesPlayed: 0,
    avgPlaytime: 0,
    bestMap: null,
    worstMap: null,
  };

  return {
    overall: {
      totalGames: 0,
      totalWins: 0,
      totalLosses: 0,
      overallWinrate: 0,
    },
    byMode: {
      [$Enums.MapType.Control]: {
        ...emptyStats,
        mapType: $Enums.MapType.Control,
      },
      [$Enums.MapType.Hybrid]: {
        ...emptyStats,
        mapType: $Enums.MapType.Hybrid,
      },
      [$Enums.MapType.Escort]: {
        ...emptyStats,
        mapType: $Enums.MapType.Escort,
      },
      [$Enums.MapType.Push]: { ...emptyStats, mapType: $Enums.MapType.Push },
      [$Enums.MapType.Clash]: { ...emptyStats, mapType: $Enums.MapType.Clash },
      [$Enums.MapType.Flashpoint]: {
        ...emptyStats,
        mapType: $Enums.MapType.Flashpoint,
      },
    },
    bestMode: null,
    worstMode: null,
  };
}

export const getMapModePerformance = cache(getMapModePerformanceUncached);
