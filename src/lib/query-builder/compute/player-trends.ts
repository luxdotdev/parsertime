import "server-only";

import { findTeamNameForMapInMemory } from "@/data/team/shared-core";
import { calculateMean } from "@/lib/distribution-utils";
import { determineRole } from "@/lib/player-table-data";
import prisma from "@/lib/prisma";
import type { ComputedRow } from "@/lib/query-builder/aggregate";
import { getTeamData } from "@/lib/query-builder/compute/shared";
import type { HeroName } from "@/types/heroes";
import {
  CalculatedStatType,
  type CalculatedStat,
} from "@/generated/prisma/client";

type PlayerMapTrendStat = {
  player: string;
  mapDataId: number;
  date: Date;
  heroes: Set<string>;
  timePlayed: number;
  eliminations: number;
  deaths: number;
  heroDamage: number;
  damageTaken: number;
};

type PeriodValues = Record<string, number>;

const TREND_THRESHOLD_PERCENT = 5;

const TREND_METRICS: {
  id: string;
  label: string;
  lowerIsBetter?: boolean;
}[] = [
  { id: "eliminations_per10", label: "Eliminations per 10" },
  { id: "deaths_per10", label: "Deaths per 10", lowerIsBetter: true },
  { id: "hero_damage_per10", label: "Hero damage per 10" },
  {
    id: "damage_taken_per10",
    label: "Damage taken per 10",
    lowerIsBetter: true,
  },
  { id: "first_pick_percentage", label: "First pick %" },
  { id: "first_death_percentage", label: "First death %", lowerIsBetter: true },
  { id: "mvp_score", label: "MVP score" },
  { id: "fight_reversal_percentage", label: "Fight reversal %" },
  { id: "fleta_deadlift_percentage", label: "Fleta deadlift %" },
  { id: "kills_per_ultimate", label: "Kills per ultimate" },
];

function emptyMapStat(
  player: string,
  mapDataId: number,
  date: Date
): PlayerMapTrendStat {
  return {
    player,
    mapDataId,
    date,
    heroes: new Set<string>(),
    timePlayed: 0,
    eliminations: 0,
    deaths: 0,
    heroDamage: 0,
    damageTaken: 0,
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

function aggregatePeriod(
  mapStats: PlayerMapTrendStat[],
  calculatedStats: CalculatedStat[]
): PeriodValues {
  const totals = mapStats.reduce(
    (acc, stat) => {
      acc.time += stat.timePlayed;
      acc.eliminations += stat.eliminations;
      acc.deaths += stat.deaths;
      acc.heroDamage += stat.heroDamage;
      acc.damageTaken += stat.damageTaken;
      return acc;
    },
    {
      time: 0,
      eliminations: 0,
      deaths: 0,
      heroDamage: 0,
      damageTaken: 0,
    }
  );

  return {
    eliminations_per10: per10(totals.eliminations, totals.time),
    deaths_per10: per10(totals.deaths, totals.time),
    hero_damage_per10: per10(totals.heroDamage, totals.time),
    damage_taken_per10: per10(totals.damageTaken, totals.time),
    first_pick_percentage: averageCalculated(
      calculatedStats,
      CalculatedStatType.FIRST_PICK_PERCENTAGE
    ),
    first_death_percentage: averageCalculated(
      calculatedStats,
      CalculatedStatType.FIRST_DEATH_PERCENTAGE
    ),
    mvp_score: averageCalculated(calculatedStats, CalculatedStatType.MVP_SCORE),
    fight_reversal_percentage: averageCalculated(
      calculatedStats,
      CalculatedStatType.FIGHT_REVERSAL_PERCENTAGE
    ),
    fleta_deadlift_percentage: averageCalculated(
      calculatedStats,
      CalculatedStatType.FLETA_DEADLIFT_PERCENTAGE
    ),
    kills_per_ultimate: averageCalculated(
      calculatedStats,
      CalculatedStatType.KILLS_PER_ULTIMATE
    ),
  };
}

function directionFor(
  improvementPercentage: number
): "improving" | "declining" | "stable" {
  if (improvementPercentage > TREND_THRESHOLD_PERCENT) return "improving";
  if (improvementPercentage < -TREND_THRESHOLD_PERCENT) return "declining";
  return "stable";
}

/**
 * Emit one row per player and trend metric, comparing the first half of scoped
 * maps against the second half. Positive improvement means better output after
 * accounting for lower-is-better metrics like deaths and damage taken.
 */
export async function computePlayerTrends(
  teamId: number,
  scrimIds: number[]
): Promise<ComputedRow[]> {
  if (scrimIds.length === 0) return [];

  const data = await getTeamData(teamId);
  const inScope = new Set(scrimIds);
  const scopedMapIds = new Set<number>();
  const teamNameByMap = new Map<number, string>();
  const dateByMap = new Map<number, Date>();

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
    dateByMap.set(record.id, record.Scrim.date);
  }

  if (scopedMapIds.size === 0) return [];
  const mapDataIds = Array.from(scopedMapIds);

  const [playerStats, calculatedStats] = await Promise.all([
    prisma.playerStat.findMany({ where: { MapDataId: { in: mapDataIds } } }),
    prisma.calculatedStat.findMany({
      where: { MapDataId: { in: mapDataIds } },
    }),
  ]);

  const maxTimeByMap = new Map<number, number>();
  for (const stat of playerStats) {
    if (stat.MapDataId == null) continue;
    const maxTime = maxTimeByMap.get(stat.MapDataId) ?? 0;
    if (stat.match_time > maxTime) {
      maxTimeByMap.set(stat.MapDataId, stat.match_time);
    }
  }

  const byPlayerMap = new Map<string, PlayerMapTrendStat>();
  const heroesByPlayer = new Map<string, Map<string, number>>();
  for (const stat of playerStats) {
    if (stat.MapDataId == null) continue;
    const teamName = teamNameByMap.get(stat.MapDataId);
    if (!teamName || stat.player_team !== teamName) continue;
    if (!data.teamRosterSet.has(stat.player_name)) continue;
    if (stat.match_time !== maxTimeByMap.get(stat.MapDataId)) continue;

    const date = dateByMap.get(stat.MapDataId);
    if (!date) continue;

    const key = `${stat.player_name}\0${stat.MapDataId}`;
    const bucket =
      byPlayerMap.get(key) ??
      emptyMapStat(stat.player_name, stat.MapDataId, date);
    bucket.heroes.add(stat.player_hero);
    bucket.timePlayed += stat.hero_time_played;
    bucket.eliminations += stat.eliminations;
    bucket.deaths += stat.deaths;
    bucket.heroDamage += stat.hero_damage_dealt;
    bucket.damageTaken += stat.damage_taken;
    byPlayerMap.set(key, bucket);

    const heroTimes =
      heroesByPlayer.get(stat.player_name) ?? new Map<string, number>();
    heroTimes.set(
      stat.player_hero,
      (heroTimes.get(stat.player_hero) ?? 0) + stat.hero_time_played
    );
    heroesByPlayer.set(stat.player_name, heroTimes);
  }

  const mapStatsByPlayer = new Map<string, PlayerMapTrendStat[]>();
  for (const stat of byPlayerMap.values()) {
    const stats = mapStatsByPlayer.get(stat.player) ?? [];
    stats.push(stat);
    mapStatsByPlayer.set(stat.player, stats);
  }

  const calcByPlayerMap = new Map<string, CalculatedStat[]>();
  for (const stat of calculatedStats) {
    if (!data.teamRosterSet.has(stat.playerName)) continue;
    const key = `${stat.playerName}\0${stat.MapDataId}`;
    const stats = calcByPlayerMap.get(key) ?? [];
    stats.push(stat);
    calcByPlayerMap.set(key, stats);
  }

  const rows: ComputedRow[] = [];
  for (const [player, mapStats] of mapStatsByPlayer.entries()) {
    if (mapStats.length < 3) continue;

    mapStats.sort((a, b) => a.date.getTime() - b.date.getTime());
    const midpoint = Math.floor(mapStats.length / 2);
    const earlyMaps = mapStats.slice(0, midpoint);
    const lateMaps = mapStats.slice(midpoint);
    if (earlyMaps.length === 0 || lateMaps.length === 0) continue;

    function calcForMaps(maps: PlayerMapTrendStat[]): CalculatedStat[] {
      return maps.flatMap(
        (map) => calcByPlayerMap.get(`${player}\0${map.mapDataId}`) ?? []
      );
    }

    const early = aggregatePeriod(earlyMaps, calcForMaps(earlyMaps));
    const late = aggregatePeriod(lateMaps, calcForMaps(lateMaps));
    const heroTimes = heroesByPlayer.get(player) ?? new Map<string, number>();
    const primaryHero =
      Array.from(heroTimes.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ??
      "Unknown";
    const primaryRole = determineRole(primaryHero as HeroName);

    for (const metric of TREND_METRICS) {
      const earlyValue = early[metric.id] ?? 0;
      const lateValue = late[metric.id] ?? 0;
      const rawChange = lateValue - earlyValue;
      const improvement = metric.lowerIsBetter ? -rawChange : rawChange;
      const improvementPercentage =
        earlyValue !== 0 ? (improvement / Math.abs(earlyValue)) * 100 : 0;

      rows.push({
        player,
        metric: metric.label,
        metric_key: metric.id,
        direction: directionFor(improvementPercentage),
        primary_hero: primaryHero,
        role:
          primaryRole === "Tank" ||
          primaryRole === "Damage" ||
          primaryRole === "Support"
            ? primaryRole
            : "Flex",
        maps: mapStats.length,
        early_maps: earlyMaps.length,
        late_maps: lateMaps.length,
        early_value: earlyValue,
        late_value: lateValue,
        raw_change: rawChange,
        improvement,
        improvement_percentage: improvementPercentage,
      });
    }
  }

  return rows;
}
