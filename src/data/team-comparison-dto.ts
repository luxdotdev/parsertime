import "server-only";

import prisma from "@/lib/prisma";
import { calculateWinner } from "@/lib/winrate";
import type { HeroName } from "@/types/heroes";
import type {
  TeamComparisonStats,
  TeamMapBreakdown,
} from "@/types/team-comparison";
import type { CalculatedStat, MapType, PlayerStat } from "@prisma/client";
import { CalculatedStatType } from "@prisma/client";
import { cache } from "react";
import type { AggregatedStats } from "./comparison-dto";
import { findTeamNameForMapInMemory, getTeamRoster } from "./team-shared-data";

/**
 * Calculates per-10 value for a stat
 */
function calculatePer10(value: number, timePlayed: number): number {
  if (timePlayed === 0) return 0;
  return (value / timePlayed) * 600;
}

/**
 * Calculates percentage
 */
function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return (value / total) * 100;
}

/**
 * Aggregates calculated stats for a team
 */
function aggregateCalculatedStatsForTeam(
  stats: CalculatedStat[]
): Partial<AggregatedStats> {
  const result: Partial<AggregatedStats> = {
    fletaDeadliftPercentage: 0,
    firstPickPercentage: 0,
    firstPickCount: 0,
    firstDeathPercentage: 0,
    firstDeathCount: 0,
    mvpScore: 0,
    mapMvpCount: 0,
    ajaxCount: 0,
    averageUltChargeTime: 0,
    averageTimeToUseUlt: 0,
    averageDroughtTime: 0,
    killsPerUltimate: 0,
    duelWinratePercentage: 0,
    fightReversalPercentage: 0,
  };

  const counts: Record<string, number> = {};

  stats.forEach((stat) => {
    switch (stat.stat) {
      case CalculatedStatType.FLETA_DEADLIFT_PERCENTAGE:
        result.fletaDeadliftPercentage =
          (result.fletaDeadliftPercentage ?? 0) + stat.value;
        counts.fletaDeadlift = (counts.fletaDeadlift ?? 0) + 1;
        break;
      case CalculatedStatType.FIRST_PICK_PERCENTAGE:
        result.firstPickPercentage =
          (result.firstPickPercentage ?? 0) + stat.value;
        counts.firstPick = (counts.firstPick ?? 0) + 1;
        break;
      case CalculatedStatType.FIRST_PICK_COUNT:
        result.firstPickCount = (result.firstPickCount ?? 0) + stat.value;
        break;
      case CalculatedStatType.FIRST_DEATH_PERCENTAGE:
        result.firstDeathPercentage =
          (result.firstDeathPercentage ?? 0) + stat.value;
        counts.firstDeath = (counts.firstDeath ?? 0) + 1;
        break;
      case CalculatedStatType.FIRST_DEATH_COUNT:
        result.firstDeathCount = (result.firstDeathCount ?? 0) + stat.value;
        break;
      case CalculatedStatType.MVP_SCORE:
        result.mvpScore = (result.mvpScore ?? 0) + stat.value;
        counts.mvpScore = (counts.mvpScore ?? 0) + 1;
        break;
      case CalculatedStatType.MAP_MVP_COUNT:
        result.mapMvpCount = (result.mapMvpCount ?? 0) + stat.value;
        break;
      case CalculatedStatType.AJAX_COUNT:
        result.ajaxCount = (result.ajaxCount ?? 0) + stat.value;
        break;
      case CalculatedStatType.AVERAGE_ULT_CHARGE_TIME:
        result.averageUltChargeTime =
          (result.averageUltChargeTime ?? 0) + stat.value;
        counts.ultCharge = (counts.ultCharge ?? 0) + 1;
        break;
      case CalculatedStatType.AVERAGE_TIME_TO_USE_ULT:
        result.averageTimeToUseUlt =
          (result.averageTimeToUseUlt ?? 0) + stat.value;
        counts.timeToUseUlt = (counts.timeToUseUlt ?? 0) + 1;
        break;
      case CalculatedStatType.AVERAGE_DROUGHT_TIME:
        result.averageDroughtTime =
          (result.averageDroughtTime ?? 0) + stat.value;
        counts.drought = (counts.drought ?? 0) + 1;
        break;
      case CalculatedStatType.KILLS_PER_ULTIMATE:
        result.killsPerUltimate = (result.killsPerUltimate ?? 0) + stat.value;
        counts.killsPerUlt = (counts.killsPerUlt ?? 0) + 1;
        break;
      case CalculatedStatType.DUEL_WINRATE_PERCENTAGE:
        result.duelWinratePercentage =
          (result.duelWinratePercentage ?? 0) + stat.value;
        counts.duelWinrate = (counts.duelWinrate ?? 0) + 1;
        break;
      case CalculatedStatType.FIGHT_REVERSAL_PERCENTAGE:
        result.fightReversalPercentage =
          (result.fightReversalPercentage ?? 0) + stat.value;
        counts.fightReversal = (counts.fightReversal ?? 0) + 1;
        break;
    }
  });

  // Average percentage-based stats
  if (counts.fletaDeadlift) {
    result.fletaDeadliftPercentage =
      (result.fletaDeadliftPercentage ?? 0) / counts.fletaDeadlift;
  }
  if (counts.firstPick) {
    result.firstPickPercentage =
      (result.firstPickPercentage ?? 0) / counts.firstPick;
  }
  if (counts.firstDeath) {
    result.firstDeathPercentage =
      (result.firstDeathPercentage ?? 0) / counts.firstDeath;
  }
  if (counts.mvpScore) {
    result.mvpScore = (result.mvpScore ?? 0) / counts.mvpScore;
  }
  if (counts.ultCharge) {
    result.averageUltChargeTime =
      (result.averageUltChargeTime ?? 0) / counts.ultCharge;
  }
  if (counts.timeToUseUlt) {
    result.averageTimeToUseUlt =
      (result.averageTimeToUseUlt ?? 0) / counts.timeToUseUlt;
  }
  if (counts.drought) {
    result.averageDroughtTime =
      (result.averageDroughtTime ?? 0) / counts.drought;
  }
  if (counts.killsPerUlt) {
    result.killsPerUltimate =
      (result.killsPerUltimate ?? 0) / counts.killsPerUlt;
  }
  if (counts.duelWinrate) {
    result.duelWinratePercentage =
      (result.duelWinratePercentage ?? 0) / counts.duelWinrate;
  }
  if (counts.fightReversal) {
    result.fightReversalPercentage =
      (result.fightReversalPercentage ?? 0) / counts.fightReversal;
  }

  return result;
}

/**
 * Aggregates player stats for a team
 */
function aggregateTeamStats(
  stats: PlayerStat[],
  calculatedStats: CalculatedStat[]
): AggregatedStats {
  const totals = stats.reduce(
    (acc, stat) => {
      acc.eliminations += stat.eliminations;
      acc.finalBlows += stat.final_blows;
      acc.deaths += stat.deaths;
      acc.allDamageDealt += stat.all_damage_dealt;
      acc.barrierDamageDealt += stat.barrier_damage_dealt;
      acc.heroDamageDealt += stat.hero_damage_dealt;
      acc.healingDealt += stat.healing_dealt;
      acc.healingReceived += stat.healing_received;
      acc.selfHealing += stat.self_healing;
      acc.damageTaken += stat.damage_taken;
      acc.damageBlocked += stat.damage_blocked;
      acc.defensiveAssists += stat.defensive_assists;
      acc.offensiveAssists += stat.offensive_assists;
      acc.ultimatesEarned += stat.ultimates_earned;
      acc.ultimatesUsed += stat.ultimates_used;
      acc.multikillBest = Math.max(acc.multikillBest, stat.multikill_best);
      acc.multikills += stat.multikills;
      acc.soloKills += stat.solo_kills;
      acc.objectiveKills += stat.objective_kills;
      acc.environmentalKills += stat.environmental_kills;
      acc.environmentalDeaths += stat.environmental_deaths;
      acc.criticalHits += stat.critical_hits;
      acc.shotsFired += stat.shots_fired;
      acc.shotsHit += stat.shots_hit;
      acc.shotsMissed += stat.shots_missed;
      acc.scopedShots += stat.scoped_shots;
      acc.scopedShotsHit += stat.scoped_shots_hit;
      acc.scopedCriticalHitKills += stat.scoped_critical_hit_kills;
      acc.heroTimePlayed += stat.hero_time_played;
      return acc;
    },
    {
      eliminations: 0,
      finalBlows: 0,
      deaths: 0,
      allDamageDealt: 0,
      barrierDamageDealt: 0,
      heroDamageDealt: 0,
      healingDealt: 0,
      healingReceived: 0,
      selfHealing: 0,
      damageTaken: 0,
      damageBlocked: 0,
      defensiveAssists: 0,
      offensiveAssists: 0,
      ultimatesEarned: 0,
      ultimatesUsed: 0,
      multikillBest: 0,
      multikills: 0,
      soloKills: 0,
      objectiveKills: 0,
      environmentalKills: 0,
      environmentalDeaths: 0,
      criticalHits: 0,
      shotsFired: 0,
      shotsHit: 0,
      shotsMissed: 0,
      scopedShots: 0,
      scopedShotsHit: 0,
      scopedCriticalHitKills: 0,
      heroTimePlayed: 0,
    }
  );

  const calculatedAggregates = aggregateCalculatedStatsForTeam(calculatedStats);

  return {
    ...totals,
    eliminationsPer10: calculatePer10(
      totals.eliminations,
      totals.heroTimePlayed
    ),
    finalBlowsPer10: calculatePer10(totals.finalBlows, totals.heroTimePlayed),
    deathsPer10: calculatePer10(totals.deaths, totals.heroTimePlayed),
    allDamagePer10: calculatePer10(
      totals.allDamageDealt,
      totals.heroTimePlayed
    ),
    heroDamagePer10: calculatePer10(
      totals.heroDamageDealt,
      totals.heroTimePlayed
    ),
    healingDealtPer10: calculatePer10(
      totals.healingDealt,
      totals.heroTimePlayed
    ),
    healingReceivedPer10: calculatePer10(
      totals.healingReceived,
      totals.heroTimePlayed
    ),
    damageTakenPer10: calculatePer10(totals.damageTaken, totals.heroTimePlayed),
    damageBlockedPer10: calculatePer10(
      totals.damageBlocked,
      totals.heroTimePlayed
    ),
    ultimatesEarnedPer10: calculatePer10(
      totals.ultimatesEarned,
      totals.heroTimePlayed
    ),
    weaponAccuracy: calculatePercentage(totals.shotsHit, totals.shotsFired),
    criticalHitAccuracy: calculatePercentage(
      totals.criticalHits,
      totals.shotsHit
    ),
    scopedAccuracy: calculatePercentage(
      totals.scopedShotsHit,
      totals.scopedShots
    ),
    scopedCriticalHitAccuracy: calculatePercentage(
      totals.scopedCriticalHitKills,
      totals.scopedShotsHit
    ),
    fletaDeadliftPercentage: calculatedAggregates.fletaDeadliftPercentage ?? 0,
    firstPickPercentage: calculatedAggregates.firstPickPercentage ?? 0,
    firstPickCount: calculatedAggregates.firstPickCount ?? 0,
    firstDeathPercentage: calculatedAggregates.firstDeathPercentage ?? 0,
    firstDeathCount: calculatedAggregates.firstDeathCount ?? 0,
    mvpScore: calculatedAggregates.mvpScore ?? 0,
    mapMvpCount: calculatedAggregates.mapMvpCount ?? 0,
    ajaxCount: calculatedAggregates.ajaxCount ?? 0,
    averageUltChargeTime: calculatedAggregates.averageUltChargeTime ?? 0,
    averageTimeToUseUlt: calculatedAggregates.averageTimeToUseUlt ?? 0,
    averageDroughtTime: calculatedAggregates.averageDroughtTime ?? 0,
    killsPerUltimate: calculatedAggregates.killsPerUltimate ?? 0,
    duelWinratePercentage: calculatedAggregates.duelWinratePercentage ?? 0,
    fightReversalPercentage: calculatedAggregates.fightReversalPercentage ?? 0,
    // Team comparisons don't calculate variance metrics
    eliminationsPer10StdDev: 0,
    deathsPer10StdDev: 0,
    allDamagePer10StdDev: 0,
    healingDealtPer10StdDev: 0,
    firstPickPercentageStdDev: 0,
    consistencyScore: 0,
  };
}

/**
 * Gets team comparison stats for a set of maps
 */
async function getTeamComparisonStatsFn(
  mapIds: number[],
  teamId: number,
  heroes?: HeroName[]
): Promise<TeamComparisonStats> {
  if (mapIds.length === 0) {
    throw new Error("At least one map must be provided");
  }

  // Get team roster
  const teamRoster = await getTeamRoster(teamId);
  const teamRosterSet = new Set(teamRoster);

  if (teamRoster.length === 0) {
    throw new Error("No team roster found");
  }

  // Fetch map data
  const maps = await prisma.map.findMany({
    where: { id: { in: mapIds } },
    include: {
      Scrim: true,
      mapData: {
        include: {
          match_start: true,
          round_end: true,
          objective_captured: true,
        },
      },
    },
  });

  const mapDataIds = maps.flatMap((map) => map.mapData.map((md) => md.id));

  if (mapDataIds.length === 0) {
    throw new Error("No map data found for the provided map IDs");
  }

  // Fetch all player stats
  const allPlayerStats = await prisma.playerStat.findMany({
    where: {
      MapDataId: { in: mapIds },
      ...(heroes && heroes.length > 0 ? { player_hero: { in: heroes } } : {}),
    },
  });

  // Fetch calculated stats
  const allCalculatedStats = await prisma.calculatedStat.findMany({
    where: {
      MapDataId: { in: mapDataIds },
      ...(heroes && heroes.length > 0 ? { hero: { in: heroes } } : {}),
    },
  });

  // Map MapData IDs back to Map IDs
  const mapDataIdToMapId = new Map<number, number>();
  for (const map of maps) {
    for (const mapData of map.mapData) {
      mapDataIdToMapId.set(mapData.id, map.id);
    }
  }

  // Separate stats by team (my team vs enemy team)
  const myTeamStats: PlayerStat[] = [];
  const enemyTeamStats: PlayerStat[] = [];
  const myTeamCalculatedStats: CalculatedStat[] = [];
  const enemyTeamCalculatedStats: CalculatedStat[] = [];

  // Per-map breakdown
  const perMapBreakdown: TeamMapBreakdown[] = [];

  for (const map of maps) {
    const mapPlayerStats = allPlayerStats.filter(
      (stat) => stat.MapDataId === map.id
    );

    if (mapPlayerStats.length === 0) continue;

    // Find team name for this map
    const myTeamName = findTeamNameForMapInMemory(
      map.id,
      mapPlayerStats,
      teamRosterSet
    );

    if (!myTeamName) continue;

    // Get match start for metadata
    const firstMapData = map.mapData[0];
    const matchStart = firstMapData?.match_start[0];

    // Get final round and captures for winner calculation
    const roundEnds = firstMapData?.round_end ?? [];
    const finalRound =
      roundEnds.length > 0
        ? roundEnds.reduce((latest, current) =>
            current.round_number > latest.round_number ? current : latest
          )
        : null;

    const allCaptures = firstMapData?.objective_captured ?? [];
    const team1Captures = allCaptures.filter(
      (c) => c.capturing_team === matchStart?.team_1_name
    );
    const team2Captures = allCaptures.filter(
      (c) => c.capturing_team === matchStart?.team_2_name
    );

    // Determine enemy team name
    const enemyTeamName =
      matchStart?.team_1_name === myTeamName
        ? matchStart?.team_2_name
        : matchStart?.team_1_name;

    // Separate stats by team for this map
    const myTeamMapStats = mapPlayerStats.filter(
      (stat) => stat.player_team === myTeamName
    );
    const enemyTeamMapStats = mapPlayerStats.filter(
      (stat) => stat.player_team === enemyTeamName
    );

    myTeamStats.push(...myTeamMapStats);
    enemyTeamStats.push(...enemyTeamMapStats);

    // Separate calculated stats
    const mapCalculatedStats = allCalculatedStats.filter(
      (stat) => mapDataIdToMapId.get(stat.MapDataId) === map.id
    );

    const myTeamMapCalculatedStats = mapCalculatedStats.filter((stat) =>
      teamRosterSet.has(stat.playerName)
    );
    const enemyTeamMapCalculatedStats = mapCalculatedStats.filter(
      (stat) => !teamRosterSet.has(stat.playerName)
    );

    myTeamCalculatedStats.push(...myTeamMapCalculatedStats);
    enemyTeamCalculatedStats.push(...enemyTeamMapCalculatedStats);

    // Calculate aggregated stats for this map
    const myTeamMapAggregated = aggregateTeamStats(
      myTeamMapStats,
      myTeamMapCalculatedStats
    );
    const enemyTeamMapAggregated = aggregateTeamStats(
      enemyTeamMapStats,
      enemyTeamMapCalculatedStats
    );

    // Determine winner for this map
    const winnerTeamName = calculateWinner({
      matchDetails: matchStart ?? null,
      finalRound: finalRound ?? null,
      team1Captures,
      team2Captures,
    });

    const winner: TeamMapBreakdown["winner"] =
      winnerTeamName === myTeamName
        ? "myTeam"
        : winnerTeamName === enemyTeamName
          ? "enemyTeam"
          : winnerTeamName === "N/A"
            ? null
            : "draw";

    perMapBreakdown.push({
      mapId: map.id,
      mapDataId: firstMapData?.id ?? 0,
      mapName: matchStart?.map_name || map.name,
      mapType: matchStart?.map_type || ("Control" as MapType),
      scrimId: map.scrimId ?? 0,
      scrimName: map.Scrim?.name ?? "Unknown",
      date: map.Scrim?.date ?? map.createdAt,
      replayCode: map.replayCode,
      myTeamName: myTeamName ?? "My Team",
      enemyTeamName: enemyTeamName ?? "Enemy Team",
      myTeamStats: myTeamMapAggregated,
      enemyTeamStats: enemyTeamMapAggregated,
      winner,
    });
  }

  // Sort by date
  perMapBreakdown.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Aggregate overall stats
  const myTeamAggregated = aggregateTeamStats(
    myTeamStats,
    myTeamCalculatedStats
  );
  const enemyTeamAggregated = aggregateTeamStats(
    enemyTeamStats,
    enemyTeamCalculatedStats
  );

  // Get team names from first map
  const firstMapTeamName =
    perMapBreakdown.length > 0 ? perMapBreakdown[0].myTeamName : "My Team";
  const firstMapEnemyTeamName =
    perMapBreakdown.length > 0
      ? perMapBreakdown[0].enemyTeamName
      : "Enemy Team";

  // Count unique players
  const myTeamPlayerSet = new Set(myTeamStats.map((stat) => stat.player_name));
  const enemyTeamPlayerSet = new Set(
    enemyTeamStats.map((stat) => stat.player_name)
  );

  return {
    mapCount: perMapBreakdown.length,
    mapIds,
    myTeam: {
      teamName: firstMapTeamName,
      playerCount: myTeamPlayerSet.size,
      stats: myTeamAggregated,
    },
    enemyTeam: {
      teamName: firstMapEnemyTeamName,
      playerCount: enemyTeamPlayerSet.size,
      stats: enemyTeamAggregated,
    },
    perMapBreakdown,
  };
}

export const getTeamComparisonStats = cache(getTeamComparisonStatsFn);
