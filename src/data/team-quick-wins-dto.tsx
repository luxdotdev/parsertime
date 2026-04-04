import "server-only";

import { mercyRezToKillEvent, ultimateStartToKillEvent } from "@/lib/utils";
import { calculateWinner } from "@/lib/winrate";
import type { Kill } from "@prisma/client";
import { cache } from "react";
import { getTeamFightStats } from "./team-fight-stats-dto";
import {
  buildCapturesMaps,
  buildFinalRoundMap,
  buildMatchStartMap,
  buildProgressMaps,
  findTeamNameForMapInMemory,
} from "./team-shared-core";
import type { ExtendedTeamData, TeamDateRange } from "./team-shared-core";
import { getExtendedTeamData } from "./team-shared-data";

export type QuickWinsStats = {
  last10GamesPerformance: {
    wins: number;
    losses: number;
    winrate: number;
  };
  bestDayOfWeek: {
    day: string;
    wins: number;
    losses: number;
    winrate: number;
    gamesPlayed: number;
  } | null;
  averageFightDuration: number | null;
  firstPickSuccessRate: {
    successfulFirstPicks: number;
    totalFirstPicks: number;
    successRate: number;
  } | null;
};

type FightEvent = Kill & {
  ultimate_id?: number;
};

type Fight = {
  events: FightEvent[];
  start: number;
  end: number;
};

function analyzeFightOutcome(
  fight: Fight,
  ourTeamName: string
): { won: boolean; hadFirstPick: boolean } {
  const sortedEvents = [...fight.events].sort(
    (a, b) => a.match_time - b.match_time
  );

  const kills = sortedEvents.filter(
    (e) => e.event_type === "kill" || e.event_type === "mercy_rez"
  );

  let ourKills = 0;
  let enemyKills = 0;

  for (const kill of kills) {
    if (kill.event_type === "mercy_rez") {
      if (kill.victim_team === ourTeamName) {
        enemyKills = Math.max(0, enemyKills - 1);
      } else {
        ourKills = Math.max(0, ourKills - 1);
      }
    } else {
      if (kill.attacker_team === ourTeamName) {
        ourKills++;
      } else {
        enemyKills++;
      }
    }
  }

  const won = ourKills > enemyKills;

  const firstKill = kills.find((k) => k.event_type === "kill");
  const hadFirstPick = firstKill
    ? firstKill.attacker_team === ourTeamName
    : false;

  return { won, hadFirstPick };
}

async function getQuickWinsStatsUncached(
  teamId: number,
  dateRange?: TeamDateRange
): Promise<QuickWinsStats> {
  const [fightStats, sharedData] = await Promise.all([
    getTeamFightStats(teamId, dateRange),
    getExtendedTeamData(teamId, {
      excludePush: true,
      excludeClash: true,
      includeDateInfo: true,
      dateRange,
    }),
  ]);

  return processQuickWinsStats(sharedData, fightStats);
}

function processQuickWinsStats(
  sharedData: ExtendedTeamData,
  fightStats: Awaited<ReturnType<typeof getTeamFightStats>>
): QuickWinsStats {
  const {
    teamRosterSet,
    mapDataRecords: rawMapDataRecords,
    allPlayerStats,
    matchStarts,
    finalRounds,
    captures,
    payloadProgresses,
    pointProgresses,
    allKills,
    allRezzes,
    allUltimates,
  } = sharedData;

  // Type assertion to ensure we have the Scrim data
  const mapDataRecords = rawMapDataRecords as {
    id: number;
    name: string | null;
    Scrim?: {
      id: number;
      name: string;
      date: Date;
    };
  }[];

  if (mapDataRecords.length === 0) {
    return {
      last10GamesPerformance: { wins: 0, losses: 0, winrate: 0 },
      bestDayOfWeek: null,
      averageFightDuration: null,
      firstPickSuccessRate: null,
    };
  }

  const finalRoundMap = buildFinalRoundMap(finalRounds);
  const matchStartMap = buildMatchStartMap(matchStarts);
  const { team1CapturesMap, team2CapturesMap } = buildCapturesMaps(
    captures,
    matchStartMap
  );
  const {
    team1ProgressMap: team1PayloadProgressMap,
    team2ProgressMap: team2PayloadProgressMap,
  } = buildProgressMaps(payloadProgresses, matchStartMap);
  const {
    team1ProgressMap: team1PointProgressMap,
    team2ProgressMap: team2PointProgressMap,
  } = buildProgressMaps(pointProgresses, matchStartMap);

  // Calculate match results
  type MatchResult = {
    mapDataId: number;
    scrimDate: Date;
    teamName: string;
    isWin: boolean;
  };

  const matchResults: MatchResult[] = [];

  for (const mapDataRecord of mapDataRecords) {
    const mapDataId = mapDataRecord.id;

    // Get scrim date, default to current date if not available
    const scrimDate = mapDataRecord.Scrim?.date ?? new Date();

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
      team1PayloadProgress: team1PayloadProgressMap.get(mapDataId) ?? [],
      team2PayloadProgress: team2PayloadProgressMap.get(mapDataId) ?? [],
      team1PointProgress: team1PointProgressMap.get(mapDataId) ?? [],
      team2PointProgress: team2PointProgressMap.get(mapDataId) ?? [],
    });

    const isWin = winner === teamName;

    matchResults.push({
      mapDataId,
      scrimDate,
      teamName,
      isWin,
    });
  }

  // 1. Last 10 games performance
  const last10Games = matchResults.slice(0, 10);
  const last10Wins = last10Games.filter((m) => m.isWin).length;
  const last10Losses = last10Games.length - last10Wins;
  const last10Winrate =
    last10Games.length > 0 ? (last10Wins / last10Games.length) * 100 : 0;

  // 2. Best day of week
  const dayStats = new Map<
    number,
    { wins: number; losses: number; day: string }
  >();

  const daysOfWeek = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  for (const result of matchResults) {
    const dayOfWeek = result.scrimDate.getDay();
    if (!dayStats.has(dayOfWeek)) {
      dayStats.set(dayOfWeek, {
        wins: 0,
        losses: 0,
        day: daysOfWeek[dayOfWeek],
      });
    }
    const stats = dayStats.get(dayOfWeek)!;
    if (result.isWin) {
      stats.wins++;
    } else {
      stats.losses++;
    }
  }

  let bestDay = null;
  let bestWinrate = -1;

  for (const [, stats] of dayStats) {
    const total = stats.wins + stats.losses;
    if (total >= 3) {
      // Minimum 3 games
      const winrate = (stats.wins / total) * 100;
      if (winrate > bestWinrate) {
        bestWinrate = winrate;
        bestDay = {
          day: stats.day,
          wins: stats.wins,
          losses: stats.losses,
          winrate,
          gamesPlayed: total,
        };
      }
    }
  }

  // 3. Average fight duration - Group events into fights
  const killsByMap = new Map<number, typeof allKills>();
  const rezzesByMap = new Map<number, typeof allRezzes>();
  const ultsByMap = new Map<number, typeof allUltimates>();

  for (const kill of allKills) {
    if (kill.MapDataId) {
      if (!killsByMap.has(kill.MapDataId)) {
        killsByMap.set(kill.MapDataId, []);
      }
      killsByMap.get(kill.MapDataId)!.push(kill);
    }
  }

  for (const rez of allRezzes) {
    if (rez.MapDataId) {
      if (!rezzesByMap.has(rez.MapDataId)) {
        rezzesByMap.set(rez.MapDataId, []);
      }
      rezzesByMap.get(rez.MapDataId)!.push(rez);
    }
  }

  for (const ult of allUltimates) {
    if (ult.MapDataId) {
      if (!ultsByMap.has(ult.MapDataId)) {
        ultsByMap.set(ult.MapDataId, []);
      }
      ultsByMap.get(ult.MapDataId)!.push(ult);
    }
  }

  let totalFightDuration = 0;
  let fightCount = 0;
  let successfulFirstPicks = 0;
  let totalFirstPicks = 0;

  // Process each map to calculate fight durations and first pick success
  for (const mapDataRecord of mapDataRecords) {
    const mapDataId = mapDataRecord.id;
    const ourTeamName = findTeamNameForMapInMemory(
      mapDataId,
      allPlayerStats,
      teamRosterSet
    );
    if (!ourTeamName) continue;

    const playersOnMap = allPlayerStats.filter(
      (stat) => stat.MapDataId === mapDataId && stat.player_team === ourTeamName
    );
    if (!playersOnMap.every((p) => teamRosterSet.has(p.player_name))) continue;

    // Build event array for this map
    const kills = killsByMap.get(mapDataId) ?? [];
    const rezzes = rezzesByMap.get(mapDataId) ?? [];
    const ults = ultsByMap.get(mapDataId) ?? [];

    if (kills.length === 0 && rezzes.length === 0 && ults.length === 0) {
      continue;
    }

    const events: FightEvent[] = [
      ...kills,
      ...rezzes.map((rez) => mercyRezToKillEvent(rez)),
      ...ults.map((ult) => ({
        ...ultimateStartToKillEvent(ult),
        ultimate_id: ult.ultimate_id,
      })),
    ];

    events.sort((a, b) => a.match_time - b.match_time);

    // Group into fights (15 second window)
    const fights: Fight[] = [];
    let currentFight: Fight | null = null;

    for (const event of events) {
      if (!currentFight || event.match_time - currentFight.end > 15) {
        currentFight = {
          events: [event],
          start: event.match_time,
          end: event.match_time,
        };
        fights.push(currentFight);
      } else {
        currentFight.events.push(event);
        currentFight.end = event.match_time;
      }
    }

    // Calculate fight durations and first pick success
    for (const fight of fights) {
      const duration = fight.end - fight.start;
      if (duration > 0 && duration < 300) {
        totalFightDuration += duration;
        fightCount++;
      }

      const analysis = analyzeFightOutcome(fight, ourTeamName);
      if (analysis.hadFirstPick) {
        totalFirstPicks++;
        if (analysis.won) {
          successfulFirstPicks++;
        }
      }
    }
  }

  const averageFightDuration =
    fightCount > 0 ? totalFightDuration / fightCount : null;

  // 4. First pick success rate - use the aggregated data
  const firstPickSuccessRate =
    totalFirstPicks > 0
      ? {
          successfulFirstPicks,
          totalFirstPicks,
          successRate: (successfulFirstPicks / totalFirstPicks) * 100,
        }
      : fightStats.firstPickFights > 0
        ? {
            successfulFirstPicks: fightStats.firstPickWins,
            totalFirstPicks: fightStats.firstPickFights,
            successRate: fightStats.firstPickWinrate,
          }
        : null;

  return {
    last10GamesPerformance: {
      wins: last10Wins,
      losses: last10Losses,
      winrate: last10Winrate,
    },
    bestDayOfWeek: bestDay,
    averageFightDuration,
    firstPickSuccessRate,
  };
}

export const getQuickWinsStats = cache(getQuickWinsStatsUncached);
