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

export type WinrateDataPoint = {
  date: Date;
  winrate: number;
  wins: number;
  losses: number;
  period: string;
};

export type RecentFormMatch = {
  scrimId: number;
  scrimName: string;
  date: Date;
  mapName: string;
  result: "win" | "loss";
};

export type RecentForm = {
  last5: RecentFormMatch[];
  last10: RecentFormMatch[];
  last20: RecentFormMatch[];
  last5Winrate: number;
  last10Winrate: number;
  last20Winrate: number;
};

export type StreakInfo = {
  currentStreak: {
    type: "win" | "loss" | "none";
    count: number;
  };
  longestWinStreak: {
    count: number;
    startDate: Date | null;
    endDate: Date | null;
  };
  longestLossStreak: {
    count: number;
    startDate: Date | null;
    endDate: Date | null;
  };
};

type ProcessedMatchResult = {
  scrimId: number;
  scrimName: string;
  date: Date;
  mapName: string;
  isWin: boolean;
};

async function getTeamMatchResultsUncached(
  teamId: number
): Promise<ProcessedMatchResult[]> {
  // Get shared data with Scrim info for date sorting
  const allMapDataRecords = await prisma.map.findMany({
    where: { Scrim: { Team: { id: teamId } } },
    select: {
      id: true,
      name: true,
      Scrim: {
        select: {
          id: true,
          name: true,
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

  // Filter out Push maps
  const mapDataRecords = allMapDataRecords.filter((record) => {
    const mapName = record.name;
    if (!mapName) return false;
    const mapType =
      mapNameToMapTypeMapping[mapName as keyof typeof mapNameToMapTypeMapping];
    return mapType !== $Enums.MapType.Push;
  });

  if (mapDataRecords.length === 0) {
    return [];
  }

  const sharedData = await getBaseTeamData(teamId, { excludePush: true });
  return processTeamMatchResults(sharedData, mapDataRecords);
}

function processTeamMatchResults(
  sharedData: BaseTeamData,
  mapDataRecordsWithScrim: {
    id: number;
    name: string | null;
    Scrim?: {
      id: number;
      name: string;
      date: Date;
    } | null;
  }[]
): ProcessedMatchResult[] {
  const { teamRosterSet, allPlayerStats, matchStarts, finalRounds, captures } =
    sharedData;

  const finalRoundMap = buildFinalRoundMap(finalRounds);
  const matchStartMap = buildMatchStartMap(matchStarts);
  const { team1CapturesMap, team2CapturesMap } = buildCapturesMaps(
    captures,
    matchStartMap
  );

  const matchResults: ProcessedMatchResult[] = [];

  for (const mapDataRecord of mapDataRecordsWithScrim) {
    const mapDataId = mapDataRecord.id;
    const scrim = mapDataRecord.Scrim;

    if (!scrim) continue;

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

    matchResults.push({
      scrimId: scrim.id,
      scrimName: scrim.name,
      date: scrim.date,
      mapName: mapDataRecord.name ?? "Unknown",
      isWin,
    });
  }

  return matchResults;
}

const getTeamMatchResults = cache(getTeamMatchResultsUncached);

async function getWinrateOverTimeUncached(
  teamId: number,
  groupBy: "week" | "month" = "week"
): Promise<WinrateDataPoint[]> {
  const matchResults = await getTeamMatchResults(teamId);

  if (matchResults.length === 0) {
    return [];
  }

  type PeriodKey = string;
  const periodData = new Map<
    PeriodKey,
    {
      date: Date;
      wins: number;
      losses: number;
    }
  >();

  for (const result of matchResults) {
    let periodKey: string;
    let periodDate: Date;

    if (groupBy === "week") {
      const date = new Date(result.date);
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      periodDate = new Date(date.setDate(diff));
      periodDate.setHours(0, 0, 0, 0);
      periodKey = periodDate.toISOString();
    } else {
      periodDate = new Date(result.date);
      periodDate.setDate(1);
      periodDate.setHours(0, 0, 0, 0);
      periodKey = periodDate.toISOString();
    }

    if (!periodData.has(periodKey)) {
      periodData.set(periodKey, {
        date: periodDate,
        wins: 0,
        losses: 0,
      });
    }

    const period = periodData.get(periodKey)!;
    if (result.isWin) {
      period.wins++;
    } else {
      period.losses++;
    }
  }

  const dataPoints: WinrateDataPoint[] = Array.from(periodData.values())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((period) => {
      const total = period.wins + period.losses;
      const winrate = total > 0 ? (period.wins / total) * 100 : 0;

      let periodLabel: string;
      if (groupBy === "week") {
        periodLabel = period.date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
      } else {
        periodLabel = period.date.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        });
      }

      return {
        date: period.date,
        winrate,
        wins: period.wins,
        losses: period.losses,
        period: periodLabel,
      };
    });

  return dataPoints;
}

export const getWinrateOverTime = cache(getWinrateOverTimeUncached);

async function getRecentFormUncached(teamId: number): Promise<RecentForm> {
  const matchResults = await getTeamMatchResults(teamId);

  if (matchResults.length === 0) {
    return {
      last5: [],
      last10: [],
      last20: [],
      last5Winrate: 0,
      last10Winrate: 0,
      last20Winrate: 0,
    };
  }

  const recentMatches: RecentFormMatch[] = matchResults
    .slice(0, 20)
    .map((result) => ({
      scrimId: result.scrimId,
      scrimName: result.scrimName,
      date: result.date,
      mapName: result.mapName,
      result: result.isWin ? "win" : "loss",
    }));

  const last5 = recentMatches.slice(0, 5);
  const last10 = recentMatches.slice(0, 10);
  const last20 = recentMatches;

  function calculateWinrate(matches: RecentFormMatch[]): number {
    if (matches.length === 0) return 0;
    const wins = matches.filter((m) => m.result === "win").length;
    return (wins / matches.length) * 100;
  }

  return {
    last5,
    last10,
    last20,
    last5Winrate: calculateWinrate(last5),
    last10Winrate: calculateWinrate(last10),
    last20Winrate: calculateWinrate(last20),
  };
}

export const getRecentForm = cache(getRecentFormUncached);

async function getStreakInfoUncached(teamId: number): Promise<StreakInfo> {
  const matchResults = await getTeamMatchResults(teamId);

  if (matchResults.length === 0) {
    return {
      currentStreak: { type: "none", count: 0 },
      longestWinStreak: { count: 0, startDate: null, endDate: null },
      longestLossStreak: { count: 0, startDate: null, endDate: null },
    };
  }

  let currentStreak: StreakInfo["currentStreak"] = { type: "none", count: 0 };
  if (matchResults.length > 0) {
    const streakType = matchResults[0].isWin ? "win" : "loss";
    let count = 1;
    for (let i = 1; i < matchResults.length; i++) {
      if (matchResults[i].isWin === matchResults[0].isWin) {
        count++;
      } else {
        break;
      }
    }
    currentStreak = { type: streakType, count };
  }

  let longestWinStreak = {
    count: 0,
    startDate: null as Date | null,
    endDate: null as Date | null,
  };
  let longestLossStreak = {
    count: 0,
    startDate: null as Date | null,
    endDate: null as Date | null,
  };

  let currentWinCount = 0;
  let currentWinStart: Date | null = null;
  let currentLossCount = 0;
  let currentLossStart: Date | null = null;

  for (let i = matchResults.length - 1; i >= 0; i--) {
    const result = matchResults[i];

    if (result.isWin) {
      if (currentWinCount === 0) {
        currentWinStart = result.date;
      }
      currentWinCount++;
      if (currentLossCount > 0) {
        if (currentLossCount > longestLossStreak.count) {
          longestLossStreak = {
            count: currentLossCount,
            startDate: currentLossStart,
            endDate: matchResults[i + 1].date,
          };
        }
        currentLossCount = 0;
        currentLossStart = null;
      }
    } else {
      if (currentLossCount === 0) {
        currentLossStart = result.date;
      }
      currentLossCount++;
      if (currentWinCount > 0) {
        if (currentWinCount > longestWinStreak.count) {
          longestWinStreak = {
            count: currentWinCount,
            startDate: currentWinStart,
            endDate: matchResults[i + 1].date,
          };
        }
        currentWinCount = 0;
        currentWinStart = null;
      }
    }
  }

  if (currentWinCount > longestWinStreak.count) {
    longestWinStreak = {
      count: currentWinCount,
      startDate: currentWinStart,
      endDate: matchResults[0].date,
    };
  }
  if (currentLossCount > longestLossStreak.count) {
    longestLossStreak = {
      count: currentLossCount,
      startDate: currentLossStart,
      endDate: matchResults[0].date,
    };
  }

  return {
    currentStreak,
    longestWinStreak,
    longestLossStreak,
  };
}

export const getStreakInfo = cache(getStreakInfoUncached);
