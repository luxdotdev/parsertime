import "server-only";

import prisma from "@/lib/prisma";
import type { ValidStatColumn } from "@/lib/stat-percentiles";
import { removeDuplicateRows } from "@/lib/utils";
import type { HeroName } from "@/types/heroes";
import { heroRoleMapping } from "@/types/heroes";
import { CalculatedStatType, type PlayerStat, Prisma } from "@prisma/client";
import { cache } from "react";

type HeroRole = "Tank" | "Damage" | "Support";

export type HeroStatZScore = {
  stat: ValidStatColumn;
  per10: number;
  zScore: number | null;
  heroAvgPer10: number;
  heroStdPer10: number;
  sampleSize: number;
};

export type ScoutingHeroPerformance = {
  hero: string;
  role: HeroRole;
  mapsPlayed: number;
  totalTimePlayed: number;
  stats: HeroStatZScore[];
  compositeZScore: number;
};

export type AdvancedMetrics = {
  mvpScore: number;
  fletaDeadliftPercentage: number;
  firstPickPercentage: number;
  firstPickCount: number;
  firstDeathPercentage: number;
  firstDeathCount: number;
  fightReversalPercentage: number;
  killsPerUltimate: number;
  averageUltChargeTime: number;
  averageDroughtTime: number;
  duelWinratePercentage: number;
  consistencyScore: number;
};

export type KillPatterns = {
  topHeroesEliminated: { hero: string; count: number }[];
  topHeroesDiedTo: { hero: string; count: number }[];
  killMethods: { method: string; count: number }[];
};

export type RoleDistributionEntry = {
  role: string;
  timePlayed: number;
  percentage: number;
};

export type AccuracyStats = {
  weaponAccuracy: number;
  criticalHitAccuracy: number;
  scopedAccuracy: number;
};

export type MapWinrateEntry = {
  mapName: string;
  mapType: string;
  wins: number;
  losses: number;
  winRate: number;
  played: number;
};

export type MapTypeWinrateEntry = {
  mapType: string;
  wins: number;
  losses: number;
  winRate: number;
  played: number;
};

export type CompetitiveMapWinrates = {
  byMapType: MapTypeWinrateEntry[];
  byMap: MapWinrateEntry[];
};

export type ScrimMapWinrates = {
  byMap: { mapName: string; wins: number; losses: number; winRate: number }[];
};

export type ScrimData = {
  available: true;
  mapsPlayed: number;
  totalTimePlayed: number;
  heroes: ScoutingHeroPerformance[];
  advancedMetrics: AdvancedMetrics;
  killPatterns: KillPatterns;
  roleDistribution: RoleDistributionEntry[];
  accuracy: AccuracyStats;
  kdRatio: number;
  eliminationsPer10: number;
  deathsPer10: number;
  heroDamagePer10: number;
  healingDealtPer10: number;
};

export type InsightItem = {
  category: "hero" | "map" | "stat" | "combat";
  label: string;
  detail: string;
  value: number;
};

export type PlayerScoutingAnalytics = {
  scrimData: ScrimData | null;
  competitiveMapWinrates: CompetitiveMapWinrates;
  scrimMapWinrates: ScrimMapWinrates | null;
  strengths: InsightItem[];
  weaknesses: InsightItem[];
};

const MIN_HERO_TIME_SECONDS = 120;
const MIN_HERO_MAPS = 2;

const BASELINE_STAT_COLUMNS: ValidStatColumn[] = [
  "eliminations",
  "deaths",
  "hero_damage_dealt",
  "healing_dealt",
  "damage_blocked",
];

type StatDistributionBaseline = {
  hero: string;
  stat_name: string;
  hero_avg_per10: number;
  hero_std_per10: number;
  total_players: number;
};

type BatchedBaselineRow = {
  hero: string;
  avg_eliminations_per10: number | null;
  std_eliminations_per10: number | null;
  avg_deaths_per10: number | null;
  std_deaths_per10: number | null;
  avg_hero_damage_dealt_per10: number | null;
  std_hero_damage_dealt_per10: number | null;
  avg_healing_dealt_per10: number | null;
  std_healing_dealt_per10: number | null;
  avg_damage_blocked_per10: number | null;
  std_damage_blocked_per10: number | null;
  total_players: number;
};

function createBaselineKey(hero: string, stat: ValidStatColumn): string {
  return `${hero}::${stat}`;
}

function calculatePer10(value: number, timePlayed: number): number {
  if (timePlayed === 0) return 0;
  return (value / timePlayed) * 600;
}

function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return (value / total) * 100;
}

function calculateZScoreFromBaseline(
  baseline: StatDistributionBaseline,
  stat: ValidStatColumn,
  per10Value: number
): number | null {
  if (!baseline.hero_std_per10 || baseline.hero_std_per10 === 0) return null;
  const isInverted = stat === "deaths" || stat === "damage_taken";
  const zScore = isInverted
    ? (baseline.hero_avg_per10 - per10Value) / baseline.hero_std_per10
    : (per10Value - baseline.hero_avg_per10) / baseline.hero_std_per10;
  if (!Number.isFinite(zScore)) return null;
  return zScore;
}

async function fetchBaselinesByHeroes(
  heroes: HeroName[],
  minMaps = 5,
  minTimeSeconds = 300,
  sampleLimit = 150
): Promise<Map<string, StatDistributionBaseline>> {
  if (heroes.length === 0) return new Map();

  const rows = await prisma.$queryRaw<BatchedBaselineRow[]>`
    WITH
      final_rows AS (
        SELECT DISTINCT ON ("MapDataId", player_name, player_hero)
          player_name,
          player_hero,
          eliminations,
          deaths,
          hero_damage_dealt,
          healing_dealt,
          damage_blocked,
          hero_time_played
        FROM
          "PlayerStat"
        WHERE
          player_hero IN (${Prisma.join(heroes)})
          AND hero_time_played >= 60
        ORDER BY
          "MapDataId",
          player_name,
          player_hero,
          round_number DESC,
          id DESC
      ),
      per_player_totals AS (
        SELECT
          player_hero,
          player_name,
          COUNT(*) AS maps,
          (SUM(eliminations)::numeric / SUM(hero_time_played)) * 600.0 AS elims_per10,
          (SUM(deaths)::numeric / SUM(hero_time_played)) * 600.0 AS deaths_per10,
          (SUM(hero_damage_dealt)::numeric / SUM(hero_time_played)) * 600.0 AS dmg_per10,
          (SUM(healing_dealt)::numeric / SUM(hero_time_played)) * 600.0 AS heal_per10,
          (SUM(damage_blocked)::numeric / SUM(hero_time_played)) * 600.0 AS block_per10
        FROM
          final_rows
        GROUP BY
          player_name, player_hero
        HAVING
          COUNT(*) >= ${minMaps}
          AND SUM(hero_time_played) >= ${minTimeSeconds}
      ),
      ranked AS (
        SELECT
          *,
          ROW_NUMBER() OVER (
            PARTITION BY player_hero
            ORDER BY maps DESC, player_name
          ) AS rn
        FROM
          per_player_totals
      ),
      limited AS (
        SELECT * FROM ranked WHERE rn <= ${sampleLimit}
      )
    SELECT
      player_hero AS hero,
      ROUND(AVG(elims_per10)::numeric, 2) AS avg_eliminations_per10,
      ROUND(STDDEV_SAMP(elims_per10)::numeric, 2) AS std_eliminations_per10,
      ROUND(AVG(deaths_per10)::numeric, 2) AS avg_deaths_per10,
      ROUND(STDDEV_SAMP(deaths_per10)::numeric, 2) AS std_deaths_per10,
      ROUND(AVG(dmg_per10)::numeric, 2) AS avg_hero_damage_dealt_per10,
      ROUND(STDDEV_SAMP(dmg_per10)::numeric, 2) AS std_hero_damage_dealt_per10,
      ROUND(AVG(heal_per10)::numeric, 2) AS avg_healing_dealt_per10,
      ROUND(STDDEV_SAMP(heal_per10)::numeric, 2) AS std_healing_dealt_per10,
      ROUND(AVG(block_per10)::numeric, 2) AS avg_damage_blocked_per10,
      ROUND(STDDEV_SAMP(block_per10)::numeric, 2) AS std_damage_blocked_per10,
      COUNT(*)::int AS total_players
    FROM
      limited
    GROUP BY
      player_hero
  `;

  const statColumnMapping: Record<
    string,
    { avg: keyof BatchedBaselineRow; std: keyof BatchedBaselineRow }
  > = {
    eliminations: {
      avg: "avg_eliminations_per10",
      std: "std_eliminations_per10",
    },
    deaths: { avg: "avg_deaths_per10", std: "std_deaths_per10" },
    hero_damage_dealt: {
      avg: "avg_hero_damage_dealt_per10",
      std: "std_hero_damage_dealt_per10",
    },
    healing_dealt: {
      avg: "avg_healing_dealt_per10",
      std: "std_healing_dealt_per10",
    },
    damage_blocked: {
      avg: "avg_damage_blocked_per10",
      std: "std_damage_blocked_per10",
    },
  };

  const result = new Map<string, StatDistributionBaseline>();
  for (const row of rows) {
    for (const stat of BASELINE_STAT_COLUMNS) {
      const mapping = statColumnMapping[stat];
      const avg = Number(row[mapping.avg]);
      const std = Number(row[mapping.std]);
      if (Number.isNaN(avg) || Number.isNaN(std)) continue;

      result.set(createBaselineKey(row.hero, stat), {
        hero: row.hero,
        stat_name: stat,
        hero_avg_per10: avg,
        hero_std_per10: std,
        total_players: row.total_players,
      });
    }
  }

  return result;
}

type HeroAgg = {
  hero: string;
  role: HeroRole;
  mapIds: Set<number>;
  totalTime: number;
  eliminations: number;
  deaths: number;
  heroDamageDealt: number;
  healingDealt: number;
  damageBlocked: number;
};

function aggregateStatsByHero(stats: PlayerStat[]): HeroAgg[] {
  const heroData = new Map<string, HeroAgg>();

  for (const stat of stats) {
    if (!stat.MapDataId) continue;
    if (stat.hero_time_played < MIN_HERO_TIME_SECONDS) continue;

    let data = heroData.get(stat.player_hero);
    if (!data) {
      const role = heroRoleMapping[stat.player_hero as HeroName] ?? "Damage";
      data = {
        hero: stat.player_hero,
        role,
        mapIds: new Set(),
        totalTime: 0,
        eliminations: 0,
        deaths: 0,
        heroDamageDealt: 0,
        healingDealt: 0,
        damageBlocked: 0,
      };
      heroData.set(stat.player_hero, data);
    }

    if (!data.mapIds.has(stat.MapDataId)) {
      data.mapIds.add(stat.MapDataId);
      data.totalTime += stat.hero_time_played;
      data.eliminations += stat.eliminations;
      data.deaths += stat.deaths;
      data.heroDamageDealt += stat.hero_damage_dealt;
      data.healingDealt += stat.healing_dealt;
      data.damageBlocked += stat.damage_blocked;
    }
  }

  return Array.from(heroData.values())
    .filter((h) => h.mapIds.size >= MIN_HERO_MAPS)
    .sort((a, b) => b.totalTime - a.totalTime);
}

function computeHeroZScores(
  heroAggs: HeroAgg[],
  baselines: Map<string, StatDistributionBaseline>
): ScoutingHeroPerformance[] {
  return heroAggs.map((h) => {
    const stats: HeroStatZScore[] = [];
    const zScoresForComposite: { stat: ValidStatColumn; z: number }[] = [];

    for (const stat of BASELINE_STAT_COLUMNS) {
      const per10 = calculatePer10(
        stat === "eliminations"
          ? h.eliminations
          : stat === "deaths"
            ? h.deaths
            : stat === "hero_damage_dealt"
              ? h.heroDamageDealt
              : stat === "healing_dealt"
                ? h.healingDealt
                : h.damageBlocked,
        h.totalTime
      );

      const baseline = baselines.get(createBaselineKey(h.hero, stat));
      const zScore = baseline
        ? calculateZScoreFromBaseline(baseline, stat, per10)
        : null;

      stats.push({
        stat,
        per10,
        zScore,
        heroAvgPer10: baseline?.hero_avg_per10 ?? 0,
        heroStdPer10: baseline?.hero_std_per10 ?? 0,
        sampleSize: baseline?.total_players ?? 0,
      });

      if (zScore !== null) {
        zScoresForComposite.push({ stat, z: zScore });
      }
    }

    const weights =
      h.role === "Tank"
        ? {
            eliminations: 0.2,
            deaths: 0.3,
            hero_damage_dealt: 0.2,
            healing_dealt: 0,
            damage_blocked: 0.3,
          }
        : h.role === "Support"
          ? {
              eliminations: 0.1,
              deaths: 0.25,
              hero_damage_dealt: 0.14,
              healing_dealt: 0.35,
              damage_blocked: 0,
            }
          : {
              eliminations: 0.3,
              deaths: 0.2,
              hero_damage_dealt: 0.3,
              healing_dealt: 0,
              damage_blocked: 0,
            };

    let compositeZScore = 0;
    for (const { stat, z } of zScoresForComposite) {
      const weight = weights[stat as keyof typeof weights] ?? 0;
      if (stat === "deaths") {
        compositeZScore += z * weight;
      } else {
        compositeZScore += z * weight;
      }
    }

    return {
      hero: h.hero,
      role: h.role,
      mapsPlayed: h.mapIds.size,
      totalTimePlayed: h.totalTime,
      stats,
      compositeZScore,
    };
  });
}

function buildAdvancedMetrics(
  calculatedStats: { stat: string; value: number }[],
  perMapStatGroups: PlayerStat[][]
): AdvancedMetrics {
  const metrics: AdvancedMetrics = {
    mvpScore: 0,
    fletaDeadliftPercentage: 0,
    firstPickPercentage: 0,
    firstPickCount: 0,
    firstDeathPercentage: 0,
    firstDeathCount: 0,
    fightReversalPercentage: 0,
    killsPerUltimate: 0,
    averageUltChargeTime: 0,
    averageDroughtTime: 0,
    duelWinratePercentage: 0,
    consistencyScore: 0,
  };

  const counts: Record<string, number> = {};

  for (const cs of calculatedStats) {
    switch (cs.stat) {
      case CalculatedStatType.MVP_SCORE:
        metrics.mvpScore += cs.value;
        counts.mvp = (counts.mvp ?? 0) + 1;
        break;
      case CalculatedStatType.FLETA_DEADLIFT_PERCENTAGE:
        metrics.fletaDeadliftPercentage += cs.value;
        counts.fleta = (counts.fleta ?? 0) + 1;
        break;
      case CalculatedStatType.FIRST_PICK_PERCENTAGE:
        metrics.firstPickPercentage += cs.value;
        counts.firstPick = (counts.firstPick ?? 0) + 1;
        break;
      case CalculatedStatType.FIRST_PICK_COUNT:
        metrics.firstPickCount += cs.value;
        break;
      case CalculatedStatType.FIRST_DEATH_PERCENTAGE:
        metrics.firstDeathPercentage += cs.value;
        counts.firstDeath = (counts.firstDeath ?? 0) + 1;
        break;
      case CalculatedStatType.FIRST_DEATH_COUNT:
        metrics.firstDeathCount += cs.value;
        break;
      case CalculatedStatType.FIGHT_REVERSAL_PERCENTAGE:
        metrics.fightReversalPercentage += cs.value;
        counts.fightReversal = (counts.fightReversal ?? 0) + 1;
        break;
      case CalculatedStatType.KILLS_PER_ULTIMATE:
        metrics.killsPerUltimate += cs.value;
        counts.killsPerUlt = (counts.killsPerUlt ?? 0) + 1;
        break;
      case CalculatedStatType.AVERAGE_ULT_CHARGE_TIME:
        metrics.averageUltChargeTime += cs.value;
        counts.ultCharge = (counts.ultCharge ?? 0) + 1;
        break;
      case CalculatedStatType.AVERAGE_DROUGHT_TIME:
        metrics.averageDroughtTime += cs.value;
        counts.drought = (counts.drought ?? 0) + 1;
        break;
      case CalculatedStatType.DUEL_WINRATE_PERCENTAGE:
        metrics.duelWinratePercentage += cs.value;
        counts.duel = (counts.duel ?? 0) + 1;
        break;
    }
  }

  if (counts.mvp) metrics.mvpScore /= counts.mvp;
  if (counts.fleta) metrics.fletaDeadliftPercentage /= counts.fleta;
  if (counts.firstPick) metrics.firstPickPercentage /= counts.firstPick;
  if (counts.firstDeath) metrics.firstDeathPercentage /= counts.firstDeath;
  if (counts.fightReversal)
    metrics.fightReversalPercentage /= counts.fightReversal;
  if (counts.killsPerUlt) metrics.killsPerUltimate /= counts.killsPerUlt;
  if (counts.ultCharge) metrics.averageUltChargeTime /= counts.ultCharge;
  if (counts.drought) metrics.averageDroughtTime /= counts.drought;
  if (counts.duel) metrics.duelWinratePercentage /= counts.duel;

  metrics.consistencyScore = computeConsistencyScore(perMapStatGroups);

  return metrics;
}

function computeConsistencyScore(perMapStatGroups: PlayerStat[][]): number {
  if (perMapStatGroups.length < 3) return 0;

  const per10Values: Record<string, number[]> = {
    elims: [],
    deaths: [],
    damage: [],
    healing: [],
  };

  for (const mapStats of perMapStatGroups) {
    let totalTime = 0;
    let totalElims = 0;
    let totalDeaths = 0;
    let totalDamage = 0;
    let totalHealing = 0;

    for (const s of mapStats) {
      totalTime += s.hero_time_played;
      totalElims += s.eliminations;
      totalDeaths += s.deaths;
      totalDamage += s.hero_damage_dealt;
      totalHealing += s.healing_dealt;
    }

    if (totalTime > 0) {
      per10Values.elims.push(calculatePer10(totalElims, totalTime));
      per10Values.deaths.push(calculatePer10(totalDeaths, totalTime));
      per10Values.damage.push(calculatePer10(totalDamage, totalTime));
      per10Values.healing.push(calculatePer10(totalHealing, totalTime));
    }
  }

  function mean(arr: number[]) {
    return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  }

  function stddev(arr: number[]) {
    if (arr.length < 2) return 0;
    const m = mean(arr);
    return Math.sqrt(
      arr.reduce((sum, v) => sum + (v - m) ** 2, 0) / (arr.length - 1)
    );
  }

  const cvs = [
    per10Values.elims,
    per10Values.deaths,
    per10Values.damage,
    per10Values.healing,
  ]
    .map((vals) => {
      const m = mean(vals);
      return m > 0 ? stddev(vals) / m : 0;
    })
    .filter((cv) => cv > 0);

  if (cvs.length === 0) return 0;
  const averageCV = mean(cvs);
  return Math.max(0, Math.min(100, (1 - averageCV) * 100));
}

function buildKillPatterns(
  kills: {
    attacker_hero: string;
    victim_hero: string;
    event_ability: string;
  }[],
  deaths: { attacker_hero: string; victim_hero: string }[]
): KillPatterns {
  const eliminatedCounts = new Map<string, number>();
  for (const kill of kills) {
    eliminatedCounts.set(
      kill.victim_hero,
      (eliminatedCounts.get(kill.victim_hero) ?? 0) + 1
    );
  }

  const diedToCounts = new Map<string, number>();
  for (const death of deaths) {
    diedToCounts.set(
      death.attacker_hero,
      (diedToCounts.get(death.attacker_hero) ?? 0) + 1
    );
  }

  const methodCounts = new Map<string, number>();
  for (const kill of kills) {
    const method = kill.event_ability || "Primary Fire";
    methodCounts.set(method, (methodCounts.get(method) ?? 0) + 1);
  }

  return {
    topHeroesEliminated: Array.from(eliminatedCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hero, count]) => ({ hero, count })),
    topHeroesDiedTo: Array.from(diedToCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hero, count]) => ({ hero, count })),
    killMethods: Array.from(methodCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([method, count]) => ({ method, count })),
  };
}

function buildRoleDistribution(stats: PlayerStat[]): RoleDistributionEntry[] {
  const roleTime = new Map<string, number>();
  let totalTime = 0;

  for (const stat of stats) {
    const role = heroRoleMapping[stat.player_hero as HeroName] ?? "Damage";
    roleTime.set(role, (roleTime.get(role) ?? 0) + stat.hero_time_played);
    totalTime += stat.hero_time_played;
  }

  return Array.from(roleTime.entries())
    .map(([role, timePlayed]) => ({
      role,
      timePlayed,
      percentage: calculatePercentage(timePlayed, totalTime),
    }))
    .sort((a, b) => b.timePlayed - a.timePlayed);
}

async function fetchCompetitiveMapWinrates(
  playerName: string
): Promise<CompetitiveMapWinrates> {
  const assignments = await prisma.scoutingHeroAssignment.findMany({
    where: { playerName: { equals: playerName, mode: "insensitive" } },
    select: {
      team: true,
      mapResult: {
        select: {
          id: true,
          mapName: true,
          mapType: true,
          winner: true,
          match: {
            select: {
              team1: true,
              team2: true,
            },
          },
        },
      },
    },
  });

  const mapResults = new Map<
    number,
    { mapName: string; mapType: string; won: boolean }
  >();

  for (const assignment of assignments) {
    if (mapResults.has(assignment.mapResult.id)) continue;

    const isTeam1 = assignment.team === "team1";
    const playerTeamAbbr = isTeam1
      ? assignment.mapResult.match.team1
      : assignment.mapResult.match.team2;

    mapResults.set(assignment.mapResult.id, {
      mapName: assignment.mapResult.mapName,
      mapType: assignment.mapResult.mapType,
      won: assignment.mapResult.winner === playerTeamAbbr,
    });
  }

  const byMapType = new Map<string, { wins: number; losses: number }>();
  const byMap = new Map<
    string,
    { mapType: string; wins: number; losses: number }
  >();

  for (const [, result] of mapResults) {
    const typeEntry = byMapType.get(result.mapType) ?? {
      wins: 0,
      losses: 0,
    };
    if (result.won) typeEntry.wins++;
    else typeEntry.losses++;
    byMapType.set(result.mapType, typeEntry);

    const mapEntry = byMap.get(result.mapName) ?? {
      mapType: result.mapType,
      wins: 0,
      losses: 0,
    };
    if (result.won) mapEntry.wins++;
    else mapEntry.losses++;
    byMap.set(result.mapName, mapEntry);
  }

  return {
    byMapType: Array.from(byMapType.entries())
      .map(([mapType, data]) => ({
        mapType,
        wins: data.wins,
        losses: data.losses,
        played: data.wins + data.losses,
        winRate:
          data.wins + data.losses > 0
            ? (data.wins / (data.wins + data.losses)) * 100
            : 0,
      }))
      .sort((a, b) => b.played - a.played),
    byMap: Array.from(byMap.entries())
      .map(([mapName, data]) => ({
        mapName,
        mapType: data.mapType,
        wins: data.wins,
        losses: data.losses,
        played: data.wins + data.losses,
        winRate:
          data.wins + data.losses > 0
            ? (data.wins / (data.wins + data.losses)) * 100
            : 0,
      }))
      .sort((a, b) => b.played - a.played),
  };
}

async function getPlayerScoutingAnalyticsFn(
  playerName: string
): Promise<PlayerScoutingAnalytics> {
  const competitiveMapWinrates = await fetchCompetitiveMapWinrates(playerName);

  const playerStatCheck = await prisma.playerStat.findFirst({
    where: { player_name: { equals: playerName, mode: "insensitive" } },
    select: { id: true },
  });

  if (!playerStatCheck) {
    return {
      scrimData: null,
      competitiveMapWinrates,
      scrimMapWinrates: null,
      strengths: [],
      weaknesses: [],
    };
  }

  const allStats = removeDuplicateRows(
    await prisma.$queryRaw<PlayerStat[]>`
      WITH maxTime AS (
        SELECT
            MAX("match_time") AS max_time,
            "MapDataId"
        FROM
            "PlayerStat"
        WHERE
            "player_name" ILIKE ${playerName}
        GROUP BY
            "MapDataId"
      )
      SELECT
          ps.*
      FROM
          "PlayerStat" ps
          INNER JOIN maxTime m ON ps."match_time" = m.max_time AND ps."MapDataId" = m."MapDataId"
      WHERE
          ps."player_name" ILIKE ${playerName}`
  );

  if (allStats.length === 0) {
    return {
      scrimData: null,
      competitiveMapWinrates,
      scrimMapWinrates: null,
      strengths: [],
      weaknesses: [],
    };
  }

  const mapDataIds = [
    ...new Set(
      allStats.map((s) => s.MapDataId).filter((id): id is number => id !== null)
    ),
  ];

  const [kills, deaths, calculatedStats] = await Promise.all([
    prisma.kill.findMany({
      where: {
        MapDataId: { in: mapDataIds },
        attacker_name: { equals: playerName, mode: "insensitive" },
      },
      select: {
        attacker_hero: true,
        victim_hero: true,
        event_ability: true,
      },
    }),
    prisma.kill.findMany({
      where: {
        MapDataId: { in: mapDataIds },
        victim_name: { equals: playerName, mode: "insensitive" },
      },
      select: { attacker_hero: true, victim_hero: true },
    }),
    prisma.calculatedStat.findMany({
      where: {
        MapDataId: { in: mapDataIds },
        playerName: { equals: playerName, mode: "insensitive" },
      },
      select: { stat: true, value: true, MapDataId: true },
    }),
  ]);

  const heroAggs = aggregateStatsByHero(allStats);
  const heroNames = heroAggs
    .map((h) => h.hero)
    .filter((h): h is HeroName => h in heroRoleMapping);
  const baselines = await fetchBaselinesByHeroes(heroNames);
  const heroes = computeHeroZScores(heroAggs, baselines);

  const perMapStatGroups: PlayerStat[][] = [];
  const statsByMap = new Map<number, PlayerStat[]>();
  for (const stat of allStats) {
    if (!stat.MapDataId) continue;
    const existing = statsByMap.get(stat.MapDataId) ?? [];
    existing.push(stat);
    statsByMap.set(stat.MapDataId, existing);
  }
  for (const [, group] of statsByMap) {
    perMapStatGroups.push(group);
  }

  const advancedMetrics = buildAdvancedMetrics(
    calculatedStats,
    perMapStatGroups
  );

  const killPatterns = buildKillPatterns(kills, deaths);
  const roleDistribution = buildRoleDistribution(allStats);

  let totalTime = 0;
  let totalElims = 0;
  let totalDeaths = 0;
  let totalHeroDamage = 0;
  let totalHealing = 0;
  let totalShotsFired = 0;
  let totalShotsHit = 0;
  let totalCriticalHits = 0;
  let totalScopedShots = 0;
  let totalScopedShotsHit = 0;

  for (const stat of allStats) {
    totalTime += stat.hero_time_played;
    totalElims += stat.eliminations;
    totalDeaths += stat.deaths;
    totalHeroDamage += stat.hero_damage_dealt;
    totalHealing += stat.healing_dealt;
    totalShotsFired += stat.shots_fired;
    totalShotsHit += stat.shots_hit;
    totalCriticalHits += stat.critical_hits;
    totalScopedShots += stat.scoped_shots;
    totalScopedShotsHit += stat.scoped_shots_hit;
  }

  const scrimData: ScrimData = {
    available: true,
    mapsPlayed: mapDataIds.length,
    totalTimePlayed: totalTime,
    heroes,
    advancedMetrics,
    killPatterns,
    roleDistribution,
    accuracy: {
      weaponAccuracy: calculatePercentage(totalShotsHit, totalShotsFired),
      criticalHitAccuracy: calculatePercentage(
        totalCriticalHits,
        totalShotsHit
      ),
      scopedAccuracy: calculatePercentage(
        totalScopedShotsHit,
        totalScopedShots
      ),
    },
    kdRatio: totalDeaths > 0 ? totalElims / totalDeaths : totalElims,
    eliminationsPer10: calculatePer10(totalElims, totalTime),
    deathsPer10: calculatePer10(totalDeaths, totalTime),
    heroDamagePer10: calculatePer10(totalHeroDamage, totalTime),
    healingDealtPer10: calculatePer10(totalHealing, totalTime),
  };

  const analytics: PlayerScoutingAnalytics = {
    scrimData,
    competitiveMapWinrates,
    scrimMapWinrates: null,
    strengths: [],
    weaknesses: [],
  };

  const insights = generatePlayerInsights(analytics);
  analytics.strengths = insights.strengths;
  analytics.weaknesses = insights.weaknesses;

  return analytics;
}

export const getPlayerScoutingAnalytics = cache(getPlayerScoutingAnalyticsFn);

function generatePlayerInsights(analytics: PlayerScoutingAnalytics): {
  strengths: InsightItem[];
  weaknesses: InsightItem[];
} {
  const strengths: InsightItem[] = [];
  const weaknesses: InsightItem[] = [];

  if (analytics.scrimData) {
    const { heroes, advancedMetrics } = analytics.scrimData;

    for (const hero of heroes) {
      if (hero.compositeZScore > 1.0) {
        strengths.push({
          category: "hero",
          label: `Elite ${hero.hero}`,
          detail: `Composite z-score of +${hero.compositeZScore.toFixed(1)}σ across ${hero.mapsPlayed} maps`,
          value: hero.compositeZScore,
        });
      } else if (hero.compositeZScore < -0.5 && hero.mapsPlayed >= 3) {
        weaknesses.push({
          category: "hero",
          label: `Below average ${hero.hero}`,
          detail: `Composite z-score of ${hero.compositeZScore.toFixed(1)}σ across ${hero.mapsPlayed} maps`,
          value: hero.compositeZScore,
        });
      }
    }

    for (const hero of heroes) {
      for (const stat of hero.stats) {
        if (
          stat.zScore !== null &&
          stat.zScore > 1.5 &&
          stat.sampleSize >= 10
        ) {
          const statLabel = stat.stat.replace(/_/g, " ");
          strengths.push({
            category: "stat",
            label: `Exceptional ${statLabel}`,
            detail: `+${stat.zScore.toFixed(1)}σ on ${hero.hero} (${stat.per10.toFixed(0)}/10 vs avg ${stat.heroAvgPer10.toFixed(0)}/10)`,
            value: stat.zScore,
          });
        } else if (
          stat.zScore !== null &&
          stat.zScore < -1.5 &&
          stat.sampleSize >= 10
        ) {
          const statLabel = stat.stat.replace(/_/g, " ");
          weaknesses.push({
            category: "stat",
            label: `Weak ${statLabel}`,
            detail: `${stat.zScore.toFixed(1)}σ on ${hero.hero} (${stat.per10.toFixed(0)}/10 vs avg ${stat.heroAvgPer10.toFixed(0)}/10)`,
            value: stat.zScore,
          });
        }
      }
    }

    if (advancedMetrics.firstPickPercentage > 25) {
      strengths.push({
        category: "combat",
        label: "High-impact opener",
        detail: `${advancedMetrics.firstPickPercentage.toFixed(0)}% first pick rate with ${advancedMetrics.firstPickCount} total first picks`,
        value: advancedMetrics.firstPickPercentage,
      });
    }

    if (advancedMetrics.firstDeathPercentage > 30) {
      weaknesses.push({
        category: "combat",
        label: "Frequently caught out",
        detail: `${advancedMetrics.firstDeathPercentage.toFixed(0)}% first death rate (${advancedMetrics.firstDeathCount} first deaths)`,
        value: advancedMetrics.firstDeathPercentage,
      });
    }

    if (advancedMetrics.consistencyScore > 80) {
      strengths.push({
        category: "stat",
        label: "Highly consistent",
        detail: `${advancedMetrics.consistencyScore.toFixed(0)}/100 consistency rating across maps`,
        value: advancedMetrics.consistencyScore,
      });
    } else if (
      advancedMetrics.consistencyScore > 0 &&
      advancedMetrics.consistencyScore < 50
    ) {
      weaknesses.push({
        category: "stat",
        label: "Inconsistent performer",
        detail: `${advancedMetrics.consistencyScore.toFixed(0)}/100 consistency rating — high variance across maps`,
        value: -advancedMetrics.consistencyScore,
      });
    }

    if (heroes.length >= 2) {
      const delta = heroes[0].compositeZScore - heroes[1].compositeZScore;
      if (delta > 1.5) {
        weaknesses.push({
          category: "hero",
          label: "Narrow hero pool",
          detail: `${delta.toFixed(1)}σ drop-off from ${heroes[0].hero} to ${heroes[1].hero}`,
          value: -delta,
        });
      }
    }

    if (advancedMetrics.fightReversalPercentage > 15) {
      strengths.push({
        category: "combat",
        label: "Clutch player",
        detail: `${advancedMetrics.fightReversalPercentage.toFixed(0)}% fight reversal rate`,
        value: advancedMetrics.fightReversalPercentage,
      });
    }
  }

  for (const entry of analytics.competitiveMapWinrates.byMapType) {
    if (entry.winRate > 65 && entry.played >= 5) {
      strengths.push({
        category: "map",
        label: `Dominant on ${entry.mapType}`,
        detail: `${entry.winRate.toFixed(0)}% win rate across ${entry.played} maps`,
        value: entry.winRate,
      });
    } else if (entry.winRate < 35 && entry.played >= 3) {
      weaknesses.push({
        category: "map",
        label: `Struggles on ${entry.mapType}`,
        detail: `${entry.winRate.toFixed(0)}% win rate across ${entry.played} maps`,
        value: -entry.winRate,
      });
    }
  }

  strengths.sort((a, b) => b.value - a.value);
  weaknesses.sort((a, b) => a.value - b.value);

  return {
    strengths: strengths.slice(0, 4),
    weaknesses: weaknesses.slice(0, 4),
  };
}
