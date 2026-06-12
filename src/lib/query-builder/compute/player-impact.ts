import "server-only";

import { findTeamNameForMapInMemory } from "@/data/team/shared-core";
import {
  calculateMean,
  calculateStandardDeviation,
} from "@/lib/distribution-utils";
import { determineRole } from "@/lib/player-table-data";
import prisma from "@/lib/prisma";
import type { ComputedRow } from "@/lib/query-builder/aggregate";
import { getTeamData } from "@/lib/query-builder/compute/shared";
import type { HeroName } from "@/types/heroes";
import {
  CalculatedStatType,
  type CalculatedStat,
} from "@/generated/prisma/browser";

type MapStat = {
  player: string;
  heroes: Set<string>;
  timePlayed: number;
  eliminations: number;
  finalBlows: number;
  deaths: number;
  allDamage: number;
  heroDamage: number;
  healing: number;
  damageTaken: number;
  ultimatesUsed: number;
};

function emptyMapStat(player: string): MapStat {
  return {
    player,
    heroes: new Set<string>(),
    timePlayed: 0,
    eliminations: 0,
    finalBlows: 0,
    deaths: 0,
    allDamage: 0,
    heroDamage: 0,
    healing: 0,
    damageTaken: 0,
    ultimatesUsed: 0,
  };
}

function per10(value: number, timePlayed: number): number {
  return timePlayed > 0 ? (value / timePlayed) * 600 : 0;
}

function averageCalculated(
  stats: CalculatedStat[],
  statType: CalculatedStatType
): number {
  const values = stats
    .filter((stat) => stat.stat === statType)
    .map((stat) => stat.value);
  return values.length > 0 ? calculateMean(values) : 0;
}

function sumCalculated(
  stats: CalculatedStat[],
  statType: CalculatedStatType
): number {
  return stats
    .filter((stat) => stat.stat === statType)
    .reduce((sum, stat) => sum + stat.value, 0);
}

function stddev(values: number[]): number {
  return values.length > 1
    ? calculateStandardDeviation(values, calculateMean(values))
    : 0;
}

function consistencyScore(mapStats: MapStat[]): {
  consistency: number;
  elimsStddev: number;
  deathsStddev: number;
  damageStddev: number;
  healingStddev: number;
} {
  if (mapStats.length < 2) {
    return {
      consistency: 0,
      elimsStddev: 0,
      deathsStddev: 0,
      damageStddev: 0,
      healingStddev: 0,
    };
  }

  const elims = mapStats.map((stat) =>
    per10(stat.eliminations, stat.timePlayed)
  );
  const deaths = mapStats.map((stat) => per10(stat.deaths, stat.timePlayed));
  const damage = mapStats.map((stat) => per10(stat.allDamage, stat.timePlayed));
  const healing = mapStats.map((stat) => per10(stat.healing, stat.timePlayed));

  const elimsMean = calculateMean(elims);
  const deathsMean = calculateMean(deaths);
  const damageMean = calculateMean(damage);
  const healingMean = calculateMean(healing);
  const elimsStddev = stddev(elims);
  const deathsStddev = stddev(deaths);
  const damageStddev = stddev(damage);
  const healingStddev = stddev(healing);

  const coefficientOfVariations = [
    elimsMean > 0 ? elimsStddev / elimsMean : 0,
    deathsMean > 0 ? deathsStddev / deathsMean : 0,
    damageMean > 0 ? damageStddev / damageMean : 0,
    healingMean > 0 ? healingStddev / healingMean : 0,
  ].filter((cv) => cv > 0);

  const averageCv =
    coefficientOfVariations.length > 0
      ? calculateMean(coefficientOfVariations)
      : 0;

  return {
    consistency:
      averageCv > 0 ? Math.max(0, Math.min(100, (1 - averageCv) * 100)) : 0,
    elimsStddev,
    deathsStddev,
    damageStddev,
    healingStddev,
  };
}

/**
 * Queryable version of the comparison impact/consistency aggregate: one row per
 * player with per-10 totals, calculated-stat impact metrics, and map-to-map
 * volatility scores.
 */
export async function computePlayerImpact(
  teamId: number,
  scrimIds: number[]
): Promise<ComputedRow[]> {
  if (scrimIds.length === 0) return [];

  const data = await getTeamData(teamId);
  const inScope = new Set(scrimIds);
  const scopedMapIds = new Set<number>();
  const teamNameByMap = new Map<number, string>();

  for (const record of data.mapDataRecords) {
    if (!record.Scrim || !inScope.has(record.Scrim.id)) continue;
    const teamName = findTeamNameForMapInMemory(
      record.id,
      data.allPlayerStats,
      data.teamRosterSet
    );
    if (!teamName) continue;

    const playersOnMap = data.allPlayerStats.filter(
      (stat) => stat.MapDataId === record.id && stat.player_team === teamName
    );
    if (!playersOnMap.every((p) => data.teamRosterSet.has(p.player_name))) {
      continue;
    }

    scopedMapIds.add(record.id);
    teamNameByMap.set(record.id, teamName);
  }

  if (scopedMapIds.size === 0) return [];
  const mapDataIds = Array.from(scopedMapIds);

  const [playerStats, calculatedStats] = await Promise.all([
    prisma.playerStat.findMany({
      where: { MapDataId: { in: mapDataIds } },
    }),
    prisma.calculatedStat.findMany({
      where: { MapDataId: { in: mapDataIds } },
    }),
  ]);

  const maxTimeByMap = new Map<number, number>();
  for (const stat of playerStats) {
    if (stat.MapDataId == null) continue;
    const maxTime = maxTimeByMap.get(stat.MapDataId) ?? 0;
    if (stat.match_time > maxTime)
      maxTimeByMap.set(stat.MapDataId, stat.match_time);
  }

  const byPlayerMap = new Map<string, MapStat>();
  const heroesByPlayer = new Map<string, Map<string, number>>();
  for (const stat of playerStats) {
    if (stat.MapDataId == null) continue;
    const teamName = teamNameByMap.get(stat.MapDataId);
    if (!teamName || stat.player_team !== teamName) continue;
    if (!data.teamRosterSet.has(stat.player_name)) continue;
    if (stat.match_time !== maxTimeByMap.get(stat.MapDataId)) continue;

    const key = `${stat.player_name}\0${stat.MapDataId}`;
    const bucket = byPlayerMap.get(key) ?? emptyMapStat(stat.player_name);
    bucket.heroes.add(stat.player_hero);
    bucket.timePlayed += stat.hero_time_played;
    bucket.eliminations += stat.eliminations;
    bucket.finalBlows += stat.final_blows;
    bucket.deaths += stat.deaths;
    bucket.allDamage += stat.all_damage_dealt;
    bucket.heroDamage += stat.hero_damage_dealt;
    bucket.healing += stat.healing_dealt;
    bucket.damageTaken += stat.damage_taken;
    bucket.ultimatesUsed += stat.ultimates_used;
    byPlayerMap.set(key, bucket);

    const heroTimes =
      heroesByPlayer.get(stat.player_name) ?? new Map<string, number>();
    heroTimes.set(
      stat.player_hero,
      (heroTimes.get(stat.player_hero) ?? 0) + stat.hero_time_played
    );
    heroesByPlayer.set(stat.player_name, heroTimes);
  }

  const mapStatsByPlayer = new Map<string, MapStat[]>();
  for (const stat of byPlayerMap.values()) {
    const rows = mapStatsByPlayer.get(stat.player) ?? [];
    rows.push(stat);
    mapStatsByPlayer.set(stat.player, rows);
  }

  const calcByPlayer = new Map<string, CalculatedStat[]>();
  for (const stat of calculatedStats) {
    if (!data.teamRosterSet.has(stat.playerName)) continue;
    const stats = calcByPlayer.get(stat.playerName) ?? [];
    stats.push(stat);
    calcByPlayer.set(stat.playerName, stats);
  }

  const rows: ComputedRow[] = [];
  for (const [player, mapStats] of mapStatsByPlayer.entries()) {
    const totals = mapStats.reduce(
      (acc, stat) => {
        acc.time += stat.timePlayed;
        acc.elims += stat.eliminations;
        acc.finalBlows += stat.finalBlows;
        acc.deaths += stat.deaths;
        acc.allDamage += stat.allDamage;
        acc.heroDamage += stat.heroDamage;
        acc.healing += stat.healing;
        acc.damageTaken += stat.damageTaken;
        acc.ultimatesUsed += stat.ultimatesUsed;
        return acc;
      },
      {
        time: 0,
        elims: 0,
        finalBlows: 0,
        deaths: 0,
        allDamage: 0,
        heroDamage: 0,
        healing: 0,
        damageTaken: 0,
        ultimatesUsed: 0,
      }
    );

    const calcStats = calcByPlayer.get(player) ?? [];
    const heroTimes = heroesByPlayer.get(player) ?? new Map<string, number>();
    const heroes = Array.from(heroTimes.keys()).sort();
    const primaryHero =
      Array.from(heroTimes.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ??
      "Unknown";
    const primaryRole = determineRole(primaryHero as HeroName);
    const firstPickCount = sumCalculated(
      calcStats,
      CalculatedStatType.FIRST_PICK_COUNT
    );
    const firstDeathCount = sumCalculated(
      calcStats,
      CalculatedStatType.FIRST_DEATH_COUNT
    );
    const mapMvpCount = sumCalculated(
      calcStats,
      CalculatedStatType.MAP_MVP_COUNT
    );
    const ajaxCount = sumCalculated(calcStats, CalculatedStatType.AJAX_COUNT);
    const variance = consistencyScore(mapStats);

    rows.push({
      player,
      hero: heroes.join("|"),
      primary_hero: primaryHero,
      role:
        primaryRole === "Tank" ||
        primaryRole === "Damage" ||
        primaryRole === "Support"
          ? primaryRole
          : "Flex",
      maps: mapStats.length,
      hero_time_played: totals.time,
      eliminations: totals.elims,
      final_blows: totals.finalBlows,
      deaths: totals.deaths,
      all_damage: totals.allDamage,
      hero_damage: totals.heroDamage,
      healing: totals.healing,
      damage_taken: totals.damageTaken,
      ultimates_used: totals.ultimatesUsed,
      eliminations_per10: per10(totals.elims, totals.time),
      final_blows_per10: per10(totals.finalBlows, totals.time),
      deaths_per10: per10(totals.deaths, totals.time),
      all_damage_per10: per10(totals.allDamage, totals.time),
      hero_damage_per10: per10(totals.heroDamage, totals.time),
      healing_per10: per10(totals.healing, totals.time),
      damage_taken_per10: per10(totals.damageTaken, totals.time),
      first_pick_percentage: averageCalculated(
        calcStats,
        CalculatedStatType.FIRST_PICK_PERCENTAGE
      ),
      first_death_percentage: averageCalculated(
        calcStats,
        CalculatedStatType.FIRST_DEATH_PERCENTAGE
      ),
      first_pick_count: firstPickCount,
      first_death_count: firstDeathCount,
      first_picks_per10: per10(firstPickCount, totals.time),
      first_deaths_per10: per10(firstDeathCount, totals.time),
      mvp_score: averageCalculated(calcStats, CalculatedStatType.MVP_SCORE),
      map_mvp_count: mapMvpCount,
      map_mvp_rate:
        mapStats.length > 0 ? (mapMvpCount / mapStats.length) * 100 : 0,
      ajax_count: ajaxCount,
      ajax_per10: per10(ajaxCount, totals.time),
      kills_per_ultimate: averageCalculated(
        calcStats,
        CalculatedStatType.KILLS_PER_ULTIMATE
      ),
      average_ult_charge_time: averageCalculated(
        calcStats,
        CalculatedStatType.AVERAGE_ULT_CHARGE_TIME
      ),
      average_time_to_use_ult: averageCalculated(
        calcStats,
        CalculatedStatType.AVERAGE_TIME_TO_USE_ULT
      ),
      average_drought_time: averageCalculated(
        calcStats,
        CalculatedStatType.AVERAGE_DROUGHT_TIME
      ),
      duel_winrate_percentage: averageCalculated(
        calcStats,
        CalculatedStatType.DUEL_WINRATE_PERCENTAGE
      ),
      fight_reversal_percentage: averageCalculated(
        calcStats,
        CalculatedStatType.FIGHT_REVERSAL_PERCENTAGE
      ),
      fleta_deadlift_percentage: averageCalculated(
        calcStats,
        CalculatedStatType.FLETA_DEADLIFT_PERCENTAGE
      ),
      eliminations_per10_stddev: variance.elimsStddev,
      deaths_per10_stddev: variance.deathsStddev,
      all_damage_per10_stddev: variance.damageStddev,
      healing_per10_stddev: variance.healingStddev,
      consistency_score: variance.consistency,
    });
  }

  return rows;
}
