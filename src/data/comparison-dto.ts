import "server-only";

import prisma from "@/lib/prisma";
import { removeDuplicateRows } from "@/lib/utils";
import type { HeroName } from "@/types/heroes";
import {
  type CalculatedStat,
  CalculatedStatType,
  type MapType,
  type PlayerStat,
  Prisma,
} from "@prisma/client";
import { cache } from "react";

export type AggregatedStats = {
  eliminations: number;
  finalBlows: number;
  deaths: number;
  allDamageDealt: number;
  barrierDamageDealt: number;
  heroDamageDealt: number;
  healingDealt: number;
  healingReceived: number;
  selfHealing: number;
  damageTaken: number;
  damageBlocked: number;
  defensiveAssists: number;
  offensiveAssists: number;
  ultimatesEarned: number;
  ultimatesUsed: number;
  multikillBest: number;
  multikills: number;
  soloKills: number;
  objectiveKills: number;
  environmentalKills: number;
  environmentalDeaths: number;
  criticalHits: number;
  shotsFired: number;
  shotsHit: number;
  shotsMissed: number;
  scopedShots: number;
  scopedShotsHit: number;
  scopedCriticalHitKills: number;
  heroTimePlayed: number;
  eliminationsPer10: number;
  finalBlowsPer10: number;
  deathsPer10: number;
  allDamagePer10: number;
  heroDamagePer10: number;
  healingDealtPer10: number;
  healingReceivedPer10: number;
  damageTakenPer10: number;
  damageBlockedPer10: number;
  ultimatesEarnedPer10: number;
  weaponAccuracy: number;
  criticalHitAccuracy: number;
  scopedAccuracy: number;
  scopedCriticalHitAccuracy: number;
  fletaDeadliftPercentage: number;
  firstPickPercentage: number;
  firstPickCount: number;
  firstDeathPercentage: number;
  firstDeathCount: number;
  mvpScore: number;
  mapMvpCount: number;
  ajaxCount: number;
  averageUltChargeTime: number;
  averageTimeToUseUlt: number;
  averageDroughtTime: number;
  killsPerUltimate: number;
  duelWinratePercentage: number;
  fightReversalPercentage: number;
};

export type MapBreakdown = {
  mapId: number;
  mapDataId: number;
  mapName: string;
  mapType: MapType;
  scrimId: number;
  scrimName: string;
  date: Date;
  replayCode: string | null;
  heroes: HeroName[];
  stats: PlayerStat & {
    eliminationsPer10?: number;
    deathsPer10?: number;
    damagePer10?: number;
    healingPer10?: number;
    mitigatedPer10?: number;
  };
  calculatedStats: CalculatedStat[];
};

export type TrendsAnalysis = {
  improvingMetrics: {
    metric: string;
    change: number;
    changePercentage: number;
  }[];
  decliningMetrics: {
    metric: string;
    change: number;
    changePercentage: number;
  }[];
  earlyPerformance?: AggregatedStats;
  latePerformance?: AggregatedStats;
};

export type ComparisonStats = {
  playerName: string;
  filteredHeroes: HeroName[];
  mapCount: number;
  mapIds: number[];
  aggregated: AggregatedStats;
  perMapBreakdown: MapBreakdown[];
  trends?: TrendsAnalysis;
  heroBreakdown?: Record<string, AggregatedStats>;
};

function calculatePer10(value: number, timePlayed: number): number {
  if (timePlayed === 0) return 0;
  return (value / timePlayed) * 600;
}

function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return (value / total) * 100;
}

function aggregateCalculatedStats(
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

function aggregatePlayerStats(
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

  const calculatedAggregates = aggregateCalculatedStats(calculatedStats);

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
  };
}

function calculateTrends(
  perMapStats: PlayerStat[],
  perMapCalculatedStats: CalculatedStat[][]
): TrendsAnalysis {
  if (perMapStats.length < 3) {
    return {
      improvingMetrics: [],
      decliningMetrics: [],
    };
  }

  const midpoint = Math.floor(perMapStats.length / 2);
  const firstHalfStats = perMapStats.slice(0, midpoint);
  const secondHalfStats = perMapStats.slice(midpoint);

  const firstHalfCalculated = perMapCalculatedStats.slice(0, midpoint).flat();
  const secondHalfCalculated = perMapCalculatedStats.slice(midpoint).flat();

  const earlyPerformance = aggregatePlayerStats(
    firstHalfStats,
    firstHalfCalculated
  );
  const latePerformance = aggregatePlayerStats(
    secondHalfStats,
    secondHalfCalculated
  );

  const metricComparisons = [
    {
      name: "Eliminations per 10",
      early: earlyPerformance.eliminationsPer10,
      late: latePerformance.eliminationsPer10,
    },
    {
      name: "Deaths per 10",
      early: earlyPerformance.deathsPer10,
      late: latePerformance.deathsPer10,
      invertImprovement: true,
    },
    {
      name: "Damage Dealt per 10",
      early: earlyPerformance.heroDamagePer10,
      late: latePerformance.heroDamagePer10,
    },
    {
      name: "Damage Taken per 10",
      early: earlyPerformance.damageTakenPer10,
      late: latePerformance.damageTakenPer10,
      invertImprovement: true,
    },
    {
      name: "First Death %",
      early: earlyPerformance.firstDeathPercentage,
      late: latePerformance.firstDeathPercentage,
      invertImprovement: true,
    },
    {
      name: "MVP Score",
      early: earlyPerformance.mvpScore,
      late: latePerformance.mvpScore,
    },
  ];

  const improvingMetrics: {
    metric: string;
    change: number;
    changePercentage: number;
  }[] = [];
  const decliningMetrics: {
    metric: string;
    change: number;
    changePercentage: number;
  }[] = [];

  metricComparisons.forEach((comparison) => {
    const change = comparison.late - comparison.early;
    const changePercentage =
      comparison.early !== 0
        ? ((comparison.late - comparison.early) / comparison.early) * 100
        : 0;

    const isImprovement = comparison.invertImprovement
      ? change < 0
      : change > 0;

    if (Math.abs(changePercentage) > 5) {
      if (isImprovement) {
        improvingMetrics.push({
          metric: comparison.name,
          change,
          changePercentage,
        });
      } else {
        decliningMetrics.push({
          metric: comparison.name,
          change,
          changePercentage,
        });
      }
    }
  });

  return {
    improvingMetrics,
    decliningMetrics,
    earlyPerformance: perMapStats.length >= 4 ? earlyPerformance : undefined,
    latePerformance: perMapStats.length >= 4 ? latePerformance : undefined,
  };
}

async function getComparisonStatsFn(
  mapIds: number[],
  playerName: string,
  heroes?: HeroName[]
): Promise<ComparisonStats> {
  if (mapIds.length === 0) {
    throw new Error("At least one map must be provided");
  }

  const maps = await prisma.map.findMany({
    where: { id: { in: mapIds } },
    include: {
      Scrim: true,
      mapData: {
        include: {
          match_start: true,
        },
      },
    },
  });

  const mapDataIds = maps.flatMap((map) => map.mapData.map((md) => md.id));

  if (mapDataIds.length === 0) {
    throw new Error("No map data found for the provided map IDs");
  }

  // NOTE: PlayerStat.MapDataId actually stores Map.id, not MapData.id
  // This is confusing but confirmed by getTeamPlayersFn
  const finalRoundStats = removeDuplicateRows(
    await prisma.$queryRaw<PlayerStat[]>`
      WITH maxTime AS (
        SELECT
            MAX("match_time") AS max_time,
            "MapDataId"
        FROM
            "PlayerStat"
        WHERE
            "MapDataId" IN (${Prisma.join(mapIds)})
        GROUP BY
            "MapDataId"
      )
      SELECT
          ps.*
      FROM
          "PlayerStat" ps
          INNER JOIN maxTime m ON ps."match_time" = m.max_time AND ps."MapDataId" = m."MapDataId"
      WHERE
          ps."MapDataId" IN (${Prisma.join(mapIds)})
          AND ps."player_name" ILIKE ${playerName}
          ${heroes && heroes.length > 0 ? Prisma.sql`AND ps."player_hero" IN (${Prisma.join(heroes)})` : Prisma.empty}
    `
  );

  // CalculatedStat.MapDataId stores actual MapData.id (as per schema)
  const calculatedStatsWhere: Prisma.CalculatedStatWhereInput = {
    MapDataId: { in: mapDataIds },
    playerName: { equals: playerName, mode: "insensitive" },
    ...(heroes && heroes.length > 0 ? { hero: { in: heroes } } : {}),
  };

  const calculatedStats = await prisma.calculatedStat.findMany({
    where: calculatedStatsWhere,
  });

  // Map MapData IDs back to Map IDs for CalculatedStats
  const mapDataIdToMapId = new Map<number, number>();
  for (const map of maps) {
    for (const mapData of map.mapData) {
      mapDataIdToMapId.set(mapData.id, map.id);
    }
  }

  const calculatedStatsByMapId: Record<number, CalculatedStat[]> = {};
  calculatedStats.forEach((stat) => {
    const mapId = mapDataIdToMapId.get(stat.MapDataId);
    if (!mapId) return;
    if (!calculatedStatsByMapId[mapId]) {
      calculatedStatsByMapId[mapId] = [];
    }
    calculatedStatsByMapId[mapId].push(stat);
  });

  // PlayerStat.MapDataId already contains Map.id, so use it directly
  const statsByMapId: Record<number, PlayerStat[]> = {};
  finalRoundStats.forEach((stat) => {
    if (!stat.MapDataId) return;
    const mapId = stat.MapDataId; // Already the Map ID
    if (!statsByMapId[mapId]) {
      statsByMapId[mapId] = [];
    }
    statsByMapId[mapId].push(stat);
  });

  const perMapBreakdown: MapBreakdown[] = [];
  for (const map of maps) {
    const mapStats = statsByMapId[map.id] || [];
    const mapCalcStats = calculatedStatsByMapId[map.id] || [];

    if (mapStats.length === 0) continue;

    // Use the first mapData for metadata (map name, type, etc.)
    const firstMapData = map.mapData[0];
    const matchStart = firstMapData?.match_start[0];
    const heroesPlayed = Array.from(
      new Set(mapStats.map((s) => s.player_hero))
    );

    // Aggregate stats across all heroes played on this map
    const aggregatedMapStats = mapStats.reduce(
      (acc, stat) => ({
        eliminations: acc.eliminations + stat.eliminations,
        deaths: acc.deaths + stat.deaths,
        all_damage_dealt: acc.all_damage_dealt + stat.all_damage_dealt,
        healing_dealt: acc.healing_dealt + stat.healing_dealt,
        damage_blocked: acc.damage_blocked + stat.damage_blocked,
        hero_time_played: acc.hero_time_played + stat.hero_time_played,
      }),
      {
        eliminations: 0,
        deaths: 0,
        all_damage_dealt: 0,
        healing_dealt: 0,
        damage_blocked: 0,
        hero_time_played: 0,
      }
    );

    // Calculate per-10 stats for this map
    const timePlayed = aggregatedMapStats.hero_time_played || 0;
    const statsWithPer10 = {
      ...mapStats[0], // Use first stat for non-aggregated fields
      ...aggregatedMapStats,
      eliminationsPer10: calculatePer10(
        aggregatedMapStats.eliminations,
        timePlayed
      ),
      deathsPer10: calculatePer10(aggregatedMapStats.deaths, timePlayed),
      damagePer10: calculatePer10(
        aggregatedMapStats.all_damage_dealt,
        timePlayed
      ),
      healingPer10: calculatePer10(
        aggregatedMapStats.healing_dealt,
        timePlayed
      ),
      mitigatedPer10: calculatePer10(
        aggregatedMapStats.damage_blocked,
        timePlayed
      ),
    };

    perMapBreakdown.push({
      mapId: map.id,
      mapDataId: firstMapData?.id ?? 0,
      mapName: matchStart?.map_name || map.name,
      mapType: matchStart?.map_type || ("Control" as MapType),
      scrimId: map.scrimId ?? 0,
      scrimName: map.Scrim?.name ?? "Unknown",
      date: map.Scrim?.date ?? map.createdAt,
      replayCode: map.replayCode,
      heroes: heroesPlayed as HeroName[],
      stats: statsWithPer10,
      calculatedStats: mapCalcStats,
    });
  }

  perMapBreakdown.sort((a, b) => a.date.getTime() - b.date.getTime());

  const aggregated = aggregatePlayerStats(finalRoundStats, calculatedStats);

  const trends =
    perMapBreakdown.length >= 3
      ? calculateTrends(
          perMapBreakdown.map((m) => m.stats),
          perMapBreakdown.map((m) => m.calculatedStats)
        )
      : undefined;

  let heroBreakdown: Record<string, AggregatedStats> | undefined;
  if (!heroes || heroes.length > 1) {
    const heroesInvolved = Array.from(
      new Set(finalRoundStats.map((s) => s.player_hero))
    );
    if (heroesInvolved.length > 1) {
      heroBreakdown = {};
      for (const hero of heroesInvolved) {
        const heroStats = finalRoundStats.filter((s) => s.player_hero === hero);
        const heroCalcStats = calculatedStats.filter((s) => s.hero === hero);
        heroBreakdown[hero] = aggregatePlayerStats(heroStats, heroCalcStats);
      }
    }
  }

  return {
    playerName,
    filteredHeroes: heroes ?? [],
    mapCount: perMapBreakdown.length,
    mapIds,
    aggregated,
    perMapBreakdown,
    trends,
    heroBreakdown,
  };
}

export const getComparisonStats = cache(getComparisonStatsFn);

async function getAvailableMapsForComparisonFn(params: {
  teamId: number;
  playerName: string;
  dateFrom?: Date;
  dateTo?: Date;
  mapType?: MapType;
  heroes?: HeroName[];
}): Promise<
  {
    id: number;
    name: string;
    scrimId: number;
    scrimName: string;
    date: Date;
    mapType: MapType;
    replayCode: string | null;
    playerHeroes: HeroName[];
  }[]
> {
  const { teamId, playerName, dateFrom, dateTo, mapType, heroes } = params;

  const dateFilter =
    dateFrom || dateTo
      ? {
          date: {
            ...(dateFrom ? { gte: dateFrom } : {}),
            ...(dateTo ? { lte: dateTo } : {}),
          },
        }
      : {};

  const scrims = await prisma.scrim.findMany({
    where: {
      teamId,
      ...dateFilter,
    },
    include: {
      maps: {
        include: {
          mapData: {
            include: {
              match_start: true,
              player_stat: {
                where: {
                  player_name: { equals: playerName, mode: "insensitive" },
                  ...(heroes && heroes.length > 0
                    ? { player_hero: { in: heroes } }
                    : {}),
                },
              },
            },
          },
        },
      },
    },
  });

  const availableMaps: {
    id: number;
    name: string;
    scrimId: number;
    scrimName: string;
    date: Date;
    mapType: MapType;
    replayCode: string | null;
    playerHeroes: HeroName[];
  }[] = [];

  for (const scrim of scrims) {
    for (const map of scrim.maps) {
      const playerStats = map.mapData.flatMap((md) => md.player_stat);
      if (playerStats.length === 0) continue;

      const matchStart = map.mapData[0]?.match_start[0];
      if (!matchStart) continue;

      if (mapType && matchStart.map_type !== mapType) continue;

      const heroesPlayed = Array.from(
        new Set(playerStats.map((s) => s.player_hero))
      ) as HeroName[];

      availableMaps.push({
        id: map.id,
        name: matchStart.map_name,
        scrimId: scrim.id,
        scrimName: scrim.name,
        date: scrim.date,
        mapType: matchStart.map_type,
        replayCode: map.replayCode,
        playerHeroes: heroesPlayed,
      });
    }
  }

  availableMaps.sort((a, b) => b.date.getTime() - a.date.getTime());

  return availableMaps;
}

export const getAvailableMapsForComparison = cache(
  getAvailableMapsForComparisonFn
);

async function getTeamPlayersFn(
  teamId: number,
  mapIds?: number[]
): Promise<{ name: string; mapCount: number }[]> {
  if (mapIds && mapIds.length > 0) {
    // Verify the maps belong to this team and get their IDs
    const maps = await prisma.map.findMany({
      where: {
        id: { in: mapIds },
        Scrim: { teamId },
      },
      select: { id: true },
    });

    const validMapIds = maps.map((m) => m.id);

    if (validMapIds.length === 0) {
      return [];
    }

    // NOTE: PlayerStat.MapDataId actually stores Map.id, not MapData.id
    // This is confusing but confirmed by runtime data
    const allPlayerStats = await prisma.playerStat.findMany({
      where: { MapDataId: { in: validMapIds } },
      select: {
        player_name: true,
        MapDataId: true,
      },
    });

    // Count unique maps per player
    const playerMapCounts = new Map<string, Set<number>>();

    for (const stat of allPlayerStats) {
      const mapId = stat.MapDataId;
      if (!mapId) continue;

      const playerName = stat.player_name;
      if (!playerMapCounts.has(playerName)) {
        playerMapCounts.set(playerName, new Set());
      }
      playerMapCounts.get(playerName)!.add(mapId);
    }

    const players = Array.from(playerMapCounts.entries())
      .map(([name, mapSet]) => ({ name, mapCount: mapSet.size }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return players;
  }

  const scrims = await prisma.scrim.findMany({
    where: { teamId },
    select: {
      maps: {
        select: {
          mapData: {
            select: {
              player_stat: {
                select: {
                  player_name: true,
                },
                distinct: ["player_name"],
              },
            },
          },
        },
      },
    },
  });

  const playerMapCounts = new Map<string, number>();

  for (const scrim of scrims) {
    for (const map of scrim.maps) {
      for (const mapData of map.mapData) {
        for (const stat of mapData.player_stat) {
          const currentCount = playerMapCounts.get(stat.player_name) ?? 0;
          playerMapCounts.set(stat.player_name, currentCount + 1);
        }
      }
    }
  }

  const players = Array.from(playerMapCounts.entries())
    .map(([name, mapCount]) => ({ name, mapCount }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return players;
}

export const getTeamPlayers = cache(getTeamPlayersFn);
