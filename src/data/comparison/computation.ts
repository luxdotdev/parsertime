import {
  calculateMean,
  calculateStandardDeviation,
} from "@/lib/distribution-utils";
import {
  type CalculatedStat,
  CalculatedStatType,
  type PlayerStat,
} from "@prisma/client";
import type { AggregatedStats, TrendsAnalysis } from "./types";

export function calculatePer10(value: number, timePlayed: number): number {
  if (timePlayed === 0) return 0;
  return (value / timePlayed) * 600;
}

export function calculatePercentage(value: number, total: number): number {
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

function calculateVarianceMetrics(
  perMapStats: PlayerStat[],
  perMapCalculatedStats: CalculatedStat[][]
): {
  eliminationsPer10StdDev: number;
  deathsPer10StdDev: number;
  allDamagePer10StdDev: number;
  healingDealtPer10StdDev: number;
  firstPickPercentageStdDev: number;
  consistencyScore: number;
} {
  if (perMapStats.length < 2) {
    return {
      eliminationsPer10StdDev: 0,
      deathsPer10StdDev: 0,
      allDamagePer10StdDev: 0,
      healingDealtPer10StdDev: 0,
      firstPickPercentageStdDev: 0,
      consistencyScore: 0,
    };
  }

  const eliminationsPer10Values = perMapStats.map((stat) =>
    calculatePer10(stat.eliminations, stat.hero_time_played)
  );
  const deathsPer10Values = perMapStats.map((stat) =>
    calculatePer10(stat.deaths, stat.hero_time_played)
  );
  const allDamagePer10Values = perMapStats.map((stat) =>
    calculatePer10(stat.all_damage_dealt, stat.hero_time_played)
  );
  const healingDealtPer10Values = perMapStats.map((stat) =>
    calculatePer10(stat.healing_dealt, stat.hero_time_played)
  );

  const firstPickPercentageValues = perMapCalculatedStats
    .map((stats) => {
      const firstPickStat = stats.find(
        (s) => s.stat === CalculatedStatType.FIRST_PICK_PERCENTAGE
      );
      return firstPickStat?.value ?? 0;
    })
    .filter((v) => v > 0);

  const eliminationsPer10Mean = calculateMean(eliminationsPer10Values);
  const deathsPer10Mean = calculateMean(deathsPer10Values);
  const allDamagePer10Mean = calculateMean(allDamagePer10Values);
  const healingDealtPer10Mean = calculateMean(healingDealtPer10Values);
  const firstPickPercentageMean = calculateMean(firstPickPercentageValues);

  const eliminationsPer10StdDev = calculateStandardDeviation(
    eliminationsPer10Values,
    eliminationsPer10Mean
  );
  const deathsPer10StdDev = calculateStandardDeviation(
    deathsPer10Values,
    deathsPer10Mean
  );
  const allDamagePer10StdDev = calculateStandardDeviation(
    allDamagePer10Values,
    allDamagePer10Mean
  );
  const healingDealtPer10StdDev = calculateStandardDeviation(
    healingDealtPer10Values,
    healingDealtPer10Mean
  );
  const firstPickPercentageStdDev =
    firstPickPercentageValues.length > 1
      ? calculateStandardDeviation(
          firstPickPercentageValues,
          firstPickPercentageMean
        )
      : 0;

  const coefficientOfVariations = [
    eliminationsPer10Mean > 0
      ? eliminationsPer10StdDev / eliminationsPer10Mean
      : 0,
    deathsPer10Mean > 0 ? deathsPer10StdDev / deathsPer10Mean : 0,
    allDamagePer10Mean > 0 ? allDamagePer10StdDev / allDamagePer10Mean : 0,
    healingDealtPer10Mean > 0
      ? healingDealtPer10StdDev / healingDealtPer10Mean
      : 0,
  ].filter((cv) => cv > 0);

  const averageCV =
    coefficientOfVariations.length > 0
      ? calculateMean(coefficientOfVariations)
      : 0;

  const consistencyScore =
    averageCV > 0 ? Math.max(0, Math.min(100, (1 - averageCV) * 100)) : 0;

  return {
    eliminationsPer10StdDev,
    deathsPer10StdDev,
    allDamagePer10StdDev,
    healingDealtPer10StdDev,
    firstPickPercentageStdDev,
    consistencyScore,
  };
}

export function aggregatePlayerStats(
  stats: PlayerStat[],
  calculatedStats: CalculatedStat[],
  perMapStats?: PlayerStat[],
  perMapCalculatedStats?: CalculatedStat[][]
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

  const varianceMetrics =
    perMapStats && perMapCalculatedStats
      ? calculateVarianceMetrics(perMapStats, perMapCalculatedStats)
      : {
          eliminationsPer10StdDev: 0,
          deathsPer10StdDev: 0,
          allDamagePer10StdDev: 0,
          healingDealtPer10StdDev: 0,
          firstPickPercentageStdDev: 0,
          consistencyScore: 0,
        };

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
    ultimatesUsedPer10: calculatePer10(
      totals.ultimatesUsed,
      totals.heroTimePlayed
    ),
    soloKillsPer10: calculatePer10(totals.soloKills, totals.heroTimePlayed),
    objectiveKillsPer10: calculatePer10(
      totals.objectiveKills,
      totals.heroTimePlayed
    ),
    defensiveAssistsPer10: calculatePer10(
      totals.defensiveAssists,
      totals.heroTimePlayed
    ),
    offensiveAssistsPer10: calculatePer10(
      totals.offensiveAssists,
      totals.heroTimePlayed
    ),
    environmentalKillsPer10: calculatePer10(
      totals.environmentalKills,
      totals.heroTimePlayed
    ),
    environmentalDeathsPer10: calculatePer10(
      totals.environmentalDeaths,
      totals.heroTimePlayed
    ),
    multikillsPer10: calculatePer10(totals.multikills, totals.heroTimePlayed),
    barrierDamagePer10: calculatePer10(
      totals.barrierDamageDealt,
      totals.heroTimePlayed
    ),
    selfHealingPer10: calculatePer10(totals.selfHealing, totals.heroTimePlayed),
    firstPicksPer10: calculatePer10(
      calculatedAggregates.firstPickCount ?? 0,
      totals.heroTimePlayed
    ),
    firstDeathsPer10: calculatePer10(
      calculatedAggregates.firstDeathCount ?? 0,
      totals.heroTimePlayed
    ),
    mapMvpRate:
      perMapCalculatedStats && perMapCalculatedStats.length > 0
        ? ((calculatedAggregates.mapMvpCount ?? 0) /
            perMapCalculatedStats.length) *
          100
        : stats.length > 0
          ? ((calculatedAggregates.mapMvpCount ?? 0) / stats.length) * 100
          : 0,
    ajaxPer10: calculatePer10(
      calculatedAggregates.ajaxCount ?? 0,
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
    ...varianceMetrics,
  };
}

export function calculateTrends(
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
      name: "First Pick %",
      early: earlyPerformance.firstPickPercentage,
      late: latePerformance.firstPickPercentage,
    },
    {
      name: "MVP Score",
      early: earlyPerformance.mvpScore,
      late: latePerformance.mvpScore,
    },
    {
      name: "Fight Reversal %",
      early: earlyPerformance.fightReversalPercentage,
      late: latePerformance.fightReversalPercentage,
    },
    {
      name: "Fleta Deadlift %",
      early: earlyPerformance.fletaDeadliftPercentage,
      late: latePerformance.fletaDeadliftPercentage,
    },
    {
      name: "Kills per Ultimate",
      early: earlyPerformance.killsPerUltimate,
      late: latePerformance.killsPerUltimate,
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
