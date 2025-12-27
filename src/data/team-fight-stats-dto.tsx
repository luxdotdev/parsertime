import "server-only";

import type { Kill } from "@prisma/client";
import { cache } from "react";
import type { ExtendedTeamData } from "./team-shared-data";
import {
  findTeamNameForMapInMemory,
  getExtendedTeamData,
} from "./team-shared-data";
export type TeamFightStats = {
  totalFights: number;
  fightsWon: number;
  fightsLost: number;
  overallWinrate: number;

  // First pick analysis
  firstPickFights: number;
  firstPickWins: number;
  firstPickWinrate: number;

  // First death analysis
  firstDeathFights: number;
  firstDeathWins: number;
  firstDeathWinrate: number;

  // First ultimate analysis
  firstUltFights: number;
  firstUltWins: number;
  firstUltWinrate: number;

  // Dry fight analysis
  dryFights: number;
  dryFightWins: number;
  dryFightWinrate: number;

  // Ultimate usage
  nonDryFights: number;
  totalUltsInNonDryFights: number;
  avgUltsPerNonDryFight: number;

  // Ultimate economy
  ultimateEfficiency: number; // fights won per ultimate used
  avgUltsInWonFights: number;
  avgUltsInLostFights: number;
  wastedUltimates: number; // ults used in losing fights after 3+ player disadvantage
  totalUltsUsed: number;
};

type FightEvent = Kill & {
  ultimate_id?: number;
};

type Fight = {
  events: FightEvent[];
  start: number;
  end: number;
};

type FightAnalysis = {
  won: boolean;
  hadFirstPick: boolean;
  hadFirstDeath: boolean;
  usedFirstUlt: boolean;
  isDryFight: boolean;
  ultCount: number;
  wastedUlts: number; // ults used after fight was likely lost
};

function analyzeFightOutcome(fight: Fight, ourTeamName: string): FightAnalysis {
  // Sort events by match_time to ensure proper ordering
  const sortedEvents = [...fight.events].sort(
    (a, b) => a.match_time - b.match_time
  );

  // Separate kills and ultimates
  const kills = sortedEvents.filter(
    (e) => e.event_type === "kill" || e.event_type === "mercy_rez"
  );
  const ultimates = sortedEvents.filter(
    (e) => e.event_type === "ultimate_start"
  );

  // Count our team's ultimates
  const ourUlts = ultimates.filter((u) => u.attacker_team === ourTeamName);
  const ultCount = ourUlts.length;
  const isDryFight = ultCount === 0;

  // Track kill differential over time to detect "already lost" scenarios
  let ourKills = 0;
  let enemyKills = 0;
  let wastedUlts = 0;

  for (const event of sortedEvents) {
    // Update kill counts
    if (event.event_type === "mercy_rez") {
      if (event.victim_team === ourTeamName) {
        enemyKills = Math.max(0, enemyKills - 1);
      } else {
        ourKills = Math.max(0, ourKills - 1);
      }
    } else if (event.event_type === "kill") {
      if (event.attacker_team === ourTeamName) {
        ourKills++;
      } else {
        enemyKills++;
      }
    }

    // Check if we used an ultimate at this timestamp
    if (
      event.event_type === "ultimate_start" &&
      event.attacker_team === ourTeamName
    ) {
      // If we're down 3+ players, this ult is likely wasted
      const killDiff = ourKills - enemyKills;
      if (killDiff <= -3) {
        wastedUlts++;
      }
    }
  }

  // Determine fight winner based on final kill differential
  const won = ourKills > enemyKills;

  // Find first pick (first kill event, excluding mercy rez for this check)
  const firstKill = kills.find((k) => k.event_type === "kill");
  const hadFirstPick = firstKill
    ? firstKill.attacker_team === ourTeamName
    : false;
  const hadFirstDeath = firstKill
    ? firstKill.victim_team === ourTeamName
    : false;

  // Find first ultimate usage
  const firstUlt = ultimates[0];
  const usedFirstUlt = firstUlt
    ? firstUlt.attacker_team === ourTeamName
    : false;

  return {
    won,
    hadFirstPick,
    hadFirstDeath,
    usedFirstUlt,
    isDryFight,
    ultCount,
    wastedUlts,
  };
}

async function getTeamFightStatsUncached(
  teamId: number
): Promise<TeamFightStats> {
  const sharedData = await getExtendedTeamData(teamId);
  return processTeamFightStats(sharedData);
}

function processTeamFightStats(sharedData: ExtendedTeamData): TeamFightStats {
  const {
    teamRosterSet,
    mapDataIds,
    allPlayerStats,
    allKills,
    allRezzes,
    allUltimates,
  } = sharedData;

  if (mapDataIds.length === 0) {
    return {
      totalFights: 0,
      fightsWon: 0,
      fightsLost: 0,
      overallWinrate: 0,
      firstPickFights: 0,
      firstPickWins: 0,
      firstPickWinrate: 0,
      firstDeathFights: 0,
      firstDeathWins: 0,
      firstDeathWinrate: 0,
      firstUltFights: 0,
      firstUltWins: 0,
      firstUltWinrate: 0,
      dryFights: 0,
      dryFightWins: 0,
      dryFightWinrate: 0,
      nonDryFights: 0,
      totalUltsInNonDryFights: 0,
      avgUltsPerNonDryFight: 0,
      ultimateEfficiency: 0,
      avgUltsInWonFights: 0,
      avgUltsInLostFights: 0,
      wastedUltimates: 0,
      totalUltsUsed: 0,
    };
  }

  // Build team name lookup for each map based on roster
  const teamNameByMapId = new Map<number, string>();
  for (const mapDataId of mapDataIds) {
    const teamName = findTeamNameForMapInMemory(
      mapDataId,
      allPlayerStats,
      teamRosterSet
    );
    if (teamName) {
      teamNameByMapId.set(mapDataId, teamName);
    }
  }
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

  // Initialize aggregated statistics
  let totalFights = 0;
  let fightsWon = 0;
  let fightsLost = 0;
  let firstPickFights = 0;
  let firstPickWins = 0;
  let firstDeathFights = 0;
  let firstDeathWins = 0;
  let firstUltFights = 0;
  let firstUltWins = 0;
  let dryFights = 0;
  let dryFightWins = 0;
  let nonDryFights = 0;
  let totalUltsInNonDryFights = 0;
  let totalUltsUsed = 0;
  let ultsInWonFights = 0;
  let ultsInLostFights = 0;
  let totalWastedUlts = 0;

  // Process each map (all in-memory now)
  for (const mapDataId of mapDataIds) {
    const ourTeamName = teamNameByMapId.get(mapDataId);
    if (!ourTeamName) continue;

    // Group events into fights (in-memory)
    const kills = killsByMap.get(mapDataId) ?? [];
    const rezzes = rezzesByMap.get(mapDataId) ?? [];
    const ults = ultsByMap.get(mapDataId) ?? [];

    if (kills.length === 0 && rezzes.length === 0 && ults.length === 0) {
      continue;
    }

    // Build event array
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

    // Sort by match_time
    events.sort((a, b) => a.match_time - b.match_time);

    // Group into fights
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

    // Analyze each fight
    for (const fight of fights) {
      const analysis = analyzeFightOutcome(fight, ourTeamName);

      totalFights++;

      if (analysis.won) {
        fightsWon++;
      } else {
        fightsLost++;
      }

      if (analysis.hadFirstPick) {
        firstPickFights++;
        if (analysis.won) firstPickWins++;
      }

      if (analysis.hadFirstDeath) {
        firstDeathFights++;
        if (analysis.won) firstDeathWins++;
      }

      if (analysis.usedFirstUlt) {
        firstUltFights++;
        if (analysis.won) firstUltWins++;
      }

      if (analysis.isDryFight) {
        dryFights++;
        if (analysis.won) dryFightWins++;
      } else {
        nonDryFights++;
        totalUltsInNonDryFights += analysis.ultCount;
      }

      // Track ultimate economy metrics
      totalUltsUsed += analysis.ultCount;
      totalWastedUlts += analysis.wastedUlts;

      if (analysis.won) {
        ultsInWonFights += analysis.ultCount;
      } else {
        ultsInLostFights += analysis.ultCount;
      }
    }
  }

  // Calculate percentages
  const overallWinrate = totalFights > 0 ? (fightsWon / totalFights) * 100 : 0;
  const firstPickWinrate =
    firstPickFights > 0 ? (firstPickWins / firstPickFights) * 100 : 0;
  const firstDeathWinrate =
    firstDeathFights > 0 ? (firstDeathWins / firstDeathFights) * 100 : 0;
  const firstUltWinrate =
    firstUltFights > 0 ? (firstUltWins / firstUltFights) * 100 : 0;
  const dryFightWinrate = dryFights > 0 ? (dryFightWins / dryFights) * 100 : 0;
  const avgUltsPerNonDryFight =
    nonDryFights > 0 ? totalUltsInNonDryFights / nonDryFights : 0;

  // Ultimate economy calculations
  const ultimateEfficiency = totalUltsUsed > 0 ? fightsWon / totalUltsUsed : 0;
  const avgUltsInWonFights = fightsWon > 0 ? ultsInWonFights / fightsWon : 0;
  const avgUltsInLostFights =
    fightsLost > 0 ? ultsInLostFights / fightsLost : 0;

  return {
    totalFights,
    fightsWon,
    fightsLost,
    overallWinrate,
    firstPickFights,
    firstPickWins,
    firstPickWinrate,
    firstDeathFights,
    firstDeathWins,
    firstDeathWinrate,
    firstUltFights,
    firstUltWins,
    firstUltWinrate,
    dryFights,
    dryFightWins,
    dryFightWinrate,
    nonDryFights,
    totalUltsInNonDryFights,
    avgUltsPerNonDryFight,
    ultimateEfficiency,
    avgUltsInWonFights,
    avgUltsInLostFights,
    wastedUltimates: totalWastedUlts,
    totalUltsUsed,
  };
}

export const getTeamFightStats = cache(getTeamFightStatsUncached);
