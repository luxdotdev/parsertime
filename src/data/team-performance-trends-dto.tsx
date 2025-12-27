import "server-only";

import prisma from "@/lib/prisma";
import { calculateWinner } from "@/lib/winrate";
import { mapNameToMapTypeMapping } from "@/types/map";
import { $Enums } from "@prisma/client";
import { cache } from "react";
import { getTeamRoster } from "./team-stats-dto";

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

async function getWinrateOverTimeUncached(
  teamId: number,
  groupBy: "week" | "month" = "week"
): Promise<WinrateDataPoint[]> {
  const teamRoster = await getTeamRoster(teamId);
  const teamRosterSet = new Set(teamRoster);

  if (teamRoster.length === 0) {
    return [];
  }

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
        date: "asc",
      },
    },
  });

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

  const mapDataIds = mapDataRecords.map((md) => md.id);

  const [allPlayerStats, matchStarts, finalRounds, captures] =
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

  type MapResult = {
    mapDataId: number;
    scrimId: number;
    date: Date;
    isWin: boolean;
  };

  const mapResults: MapResult[] = [];

  for (const mapDataRecord of mapDataRecords) {
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

    mapResults.push({
      mapDataId,
      scrimId: scrim.id,
      date: scrim.date,
      isWin,
    });
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

  for (const result of mapResults) {
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
  const teamRoster = await getTeamRoster(teamId);
  const teamRosterSet = new Set(teamRoster);

  if (teamRoster.length === 0) {
    return {
      last5: [],
      last10: [],
      last20: [],
      last5Winrate: 0,
      last10Winrate: 0,
      last20Winrate: 0,
    };
  }

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

  const mapDataRecords = allMapDataRecords.filter((record) => {
    const mapName = record.name;
    if (!mapName) return false;
    const mapType =
      mapNameToMapTypeMapping[mapName as keyof typeof mapNameToMapTypeMapping];
    return mapType !== $Enums.MapType.Push;
  });

  if (mapDataRecords.length === 0) {
    return {
      last5: [],
      last10: [],
      last20: [],
      last5Winrate: 0,
      last10Winrate: 0,
      last20Winrate: 0,
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

  const recentMatches: RecentFormMatch[] = [];

  for (const mapDataRecord of mapDataRecords) {
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

    recentMatches.push({
      scrimId: scrim.id,
      scrimName: scrim.name,
      date: scrim.date,
      mapName: mapDataRecord.name ?? "Unknown",
      result: isWin ? "win" : "loss",
    });

    if (recentMatches.length >= 20) break;
  }

  const last5 = recentMatches.slice(0, 5);
  const last10 = recentMatches.slice(0, 10);
  const last20 = recentMatches.slice(0, 20);

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
  const teamRoster = await getTeamRoster(teamId);
  const teamRosterSet = new Set(teamRoster);

  if (teamRoster.length === 0) {
    return {
      currentStreak: { type: "none", count: 0 },
      longestWinStreak: { count: 0, startDate: null, endDate: null },
      longestLossStreak: { count: 0, startDate: null, endDate: null },
    };
  }

  const allMapDataRecords = await prisma.map.findMany({
    where: { Scrim: { Team: { id: teamId } } },
    select: {
      id: true,
      name: true,
      Scrim: {
        select: {
          id: true,
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

  const mapDataRecords = allMapDataRecords.filter((record) => {
    const mapName = record.name;
    if (!mapName) return false;
    const mapType =
      mapNameToMapTypeMapping[mapName as keyof typeof mapNameToMapTypeMapping];
    return mapType !== $Enums.MapType.Push;
  });

  if (mapDataRecords.length === 0) {
    return {
      currentStreak: { type: "none", count: 0 },
      longestWinStreak: { count: 0, startDate: null, endDate: null },
      longestLossStreak: { count: 0, startDate: null, endDate: null },
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

  type MatchResult = {
    date: Date;
    isWin: boolean;
  };

  const results: MatchResult[] = [];

  for (const mapDataRecord of mapDataRecords) {
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

    results.push({
      date: scrim.date,
      isWin,
    });
  }

  if (results.length === 0) {
    return {
      currentStreak: { type: "none", count: 0 },
      longestWinStreak: { count: 0, startDate: null, endDate: null },
      longestLossStreak: { count: 0, startDate: null, endDate: null },
    };
  }

  let currentStreak: StreakInfo["currentStreak"] = { type: "none", count: 0 };
  if (results.length > 0) {
    const streakType = results[0].isWin ? "win" : "loss";
    let count = 1;
    for (let i = 1; i < results.length; i++) {
      if (results[i].isWin === results[0].isWin) {
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

  for (let i = results.length - 1; i >= 0; i--) {
    const result = results[i];

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
            endDate: results[i + 1].date,
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
            endDate: results[i + 1].date,
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
      endDate: results[0].date,
    };
  }
  if (currentLossCount > longestLossStreak.count) {
    longestLossStreak = {
      count: currentLossCount,
      startDate: currentLossStart,
      endDate: results[0].date,
    };
  }

  return {
    currentStreak,
    longestWinStreak,
    longestLossStreak,
  };
}

export const getStreakInfo = cache(getStreakInfoUncached);
