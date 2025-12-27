import "server-only";

import prisma from "@/lib/prisma";
import { calculateWinner } from "@/lib/winrate";
import { mapNameToMapTypeMapping } from "@/types/map";
import type { Kill } from "@prisma/client";
import { $Enums } from "@prisma/client";
import { cache } from "react";
import { getTeamFightStats } from "./team-fight-stats-dto";
import { getTeamRoster } from "./team-stats-dto";

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
  teamId: number
): Promise<QuickWinsStats> {
  const [teamRoster, fightStats] = await Promise.all([
    getTeamRoster(teamId),
    getTeamFightStats(teamId),
  ]);

  const teamRosterSet = new Set(teamRoster);

  if (teamRoster.length === 0) {
    return {
      last10GamesPerformance: { wins: 0, losses: 0, winrate: 0 },
      bestDayOfWeek: null,
      averageFightDuration: null,
      firstPickSuccessRate: null,
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
    return mapType !== $Enums.MapType.Push && mapType !== $Enums.MapType.Clash;
  });

  if (mapDataRecords.length === 0) {
    return {
      last10GamesPerformance: { wins: 0, losses: 0, winrate: 0 },
      bestDayOfWeek: null,
      averageFightDuration: null,
      firstPickSuccessRate: null,
    };
  }

  const mapDataIds = mapDataRecords.map((md) => md.id);

  const [
    allPlayerStats,
    matchStarts,
    finalRounds,
    captures,
    allKills,
    allRezzes,
    allUltimates,
  ] = await Promise.all([
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
    prisma.kill.findMany({
      where: { MapDataId: { in: mapDataIds } },
      orderBy: { match_time: "asc" },
    }),
    prisma.mercyRez.findMany({
      where: { MapDataId: { in: mapDataIds } },
      orderBy: { match_time: "asc" },
    }),
    prisma.ultimateStart.findMany({
      where: { MapDataId: { in: mapDataIds } },
      orderBy: { match_time: "asc" },
    }),
  ]);

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
      ...rezzes.map((rez) => ({
        id: rez.id,
        scrimId: rez.scrimId,
        event_type: "mercy_rez" as const,
        match_time: rez.match_time,
        attacker_team: rez.resurrecter_team,
        attacker_name: rez.resurrecter_player,
        attacker_hero: rez.resurrecter_hero,
        victim_team: rez.resurrectee_team,
        victim_name: rez.resurrectee_player,
        victim_hero: rez.resurrectee_hero,
        event_ability: "Resurrect",
        event_damage: 0,
        is_critical_hit: "0",
        is_environmental: "0",
        MapDataId: rez.MapDataId,
      })),
      ...ults.map((ult) => ({
        id: ult.id,
        scrimId: ult.scrimId,
        event_type: "ultimate_start" as const,
        match_time: ult.match_time,
        attacker_team: ult.player_team,
        attacker_name: ult.player_name,
        attacker_hero: ult.player_hero,
        victim_team: "",
        victim_name: "",
        victim_hero: "",
        event_ability: "Ultimate",
        event_damage: 0,
        is_critical_hit: "0",
        is_environmental: "0",
        MapDataId: ult.MapDataId,
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
