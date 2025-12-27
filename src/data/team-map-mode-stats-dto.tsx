import "server-only";

import prisma from "@/lib/prisma";
import { calculateWinner } from "@/lib/winrate";
import { mapNameToMapTypeMapping } from "@/types/map";
import { $Enums } from "@prisma/client";
import { cache } from "react";
import { getTeamRoster } from "./team-stats-dto";

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

async function getMapModePerformanceUncached(
  teamId: number
): Promise<MapModePerformance> {
  const teamRoster = await getTeamRoster(teamId);
  const teamRosterSet = new Set(teamRoster);

  if (teamRoster.length === 0) {
    return createEmptyMapModePerformance();
  }

  const allMapDataRecords = await prisma.map.findMany({
    where: { Scrim: { Team: { id: teamId } } },
    select: {
      id: true,
      name: true,
    },
  });

  if (allMapDataRecords.length === 0) {
    return createEmptyMapModePerformance();
  }

  const mapDataIds = allMapDataRecords.map((md) => md.id);

  const [allPlayerStats, matchStarts, finalRounds, captures, matchEnds] =
    await Promise.all([
      prisma.playerStat.findMany({
        where: { MapDataId: { in: mapDataIds } },
        select: {
          player_name: true,
          player_team: true,
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
      prisma.matchEnd.findMany({
        where: { MapDataId: { in: mapDataIds } },
        select: {
          match_time: true,
          MapDataId: true,
        },
      }),
    ]);

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

  const matchEndMap = new Map<number, number>();
  for (const match of matchEnds) {
    if (match.MapDataId) {
      matchEndMap.set(match.MapDataId, match.match_time);
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

  type MapModeData = {
    wins: number;
    losses: number;
    totalPlaytime: number;
    mapWinrates: Map<string, { wins: number; losses: number }>;
  };

  const modeData = new Map<$Enums.MapType, MapModeData>();

  for (const mapType of Object.values($Enums.MapType)) {
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

    if (mapType === $Enums.MapType.Push) {
      continue;
    }

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
