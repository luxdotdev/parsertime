import "server-only";

import { findTeamNameForMapInMemory } from "@/data/team/shared-core";
import { determineRole } from "@/lib/player-table-data";
import prisma from "@/lib/prisma";
import type { ComputedRow } from "@/lib/query-builder/aggregate";
import { getTeamData } from "@/lib/query-builder/compute/shared";
import {
  getStatDistributionBaseline,
  type StatDistributionBaseline,
  type ValidStatColumn,
} from "@/lib/stat-percentiles";
import type { HeroName } from "@/types/heroes";

type PlayerOutlierTotals = {
  player: string;
  maps: Set<number>;
  heroTimes: Map<string, number>;
  timePlayed: number;
  eliminations: number;
  deaths: number;
  heroDamage: number;
  healing: number;
  damageBlocked: number;
};

type OutlierStatDef = {
  key: ValidStatColumn;
  label: string;
  column: keyof Pick<
    PlayerOutlierTotals,
    "eliminations" | "deaths" | "heroDamage" | "healing" | "damageBlocked"
  >;
  lowerIsBetter?: boolean;
};

const OUTLIER_THRESHOLD = 2;

const BASE_STATS: OutlierStatDef[] = [
  { key: "eliminations", label: "Eliminations", column: "eliminations" },
  { key: "deaths", label: "Deaths", column: "deaths", lowerIsBetter: true },
  {
    key: "hero_damage_dealt",
    label: "Hero damage",
    column: "heroDamage",
  },
];

const SUPPORT_STATS: OutlierStatDef[] = [
  { key: "healing_dealt", label: "Healing", column: "healing" },
];

const TANK_STATS: OutlierStatDef[] = [
  { key: "damage_blocked", label: "Damage blocked", column: "damageBlocked" },
];

function emptyTotals(player: string): PlayerOutlierTotals {
  return {
    player,
    maps: new Set<number>(),
    heroTimes: new Map<string, number>(),
    timePlayed: 0,
    eliminations: 0,
    deaths: 0,
    heroDamage: 0,
    healing: 0,
    damageBlocked: 0,
  };
}

function per10(value: number, timePlayed: number): number {
  return timePlayed > 0 ? (value / timePlayed) * 600 : 0;
}

function erf(x: number): number {
  const sign = x >= 0 ? 1 : -1;
  const absX = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * absX);
  const y =
    1 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
  return sign * y;
}

function normalCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

function zScore(
  baseline: StatDistributionBaseline,
  stat: OutlierStatDef,
  value: number
): number | null {
  if (!baseline.hero_std_per10 || baseline.hero_std_per10 === 0) return null;
  const z = stat.lowerIsBetter
    ? (baseline.hero_avg_per10 - value) / baseline.hero_std_per10
    : (value - baseline.hero_avg_per10) / baseline.hero_std_per10;
  return Number.isFinite(z) ? z : null;
}

function statDefsForRole(role: string): OutlierStatDef[] {
  if (role === "Support") return [...BASE_STATS, ...SUPPORT_STATS];
  if (role === "Tank") return [...BASE_STATS, ...TANK_STATS];
  return BASE_STATS;
}

/**
 * Queryable version of the scrim overview's hero-baseline z-score outliers.
 * Each row compares one player's scoped output on their primary hero role
 * against the global hero distribution for that stat.
 */
export async function computePlayerOutliers(
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
  const playerStats = await prisma.playerStat.findMany({
    where: { MapDataId: { in: mapDataIds } },
  });

  const maxTimeByMap = new Map<number, number>();
  for (const stat of playerStats) {
    if (stat.MapDataId == null) continue;
    const maxTime = maxTimeByMap.get(stat.MapDataId) ?? 0;
    if (stat.match_time > maxTime) {
      maxTimeByMap.set(stat.MapDataId, stat.match_time);
    }
  }

  const totalsByPlayer = new Map<string, PlayerOutlierTotals>();
  for (const stat of playerStats) {
    if (stat.MapDataId == null) continue;
    const teamName = teamNameByMap.get(stat.MapDataId);
    if (!teamName || stat.player_team !== teamName) continue;
    if (!data.teamRosterSet.has(stat.player_name)) continue;
    if (stat.match_time !== maxTimeByMap.get(stat.MapDataId)) continue;

    const totals =
      totalsByPlayer.get(stat.player_name) ?? emptyTotals(stat.player_name);
    totals.maps.add(stat.MapDataId);
    totals.timePlayed += stat.hero_time_played;
    totals.eliminations += stat.eliminations;
    totals.deaths += stat.deaths;
    totals.heroDamage += stat.hero_damage_dealt;
    totals.healing += stat.healing_dealt;
    totals.damageBlocked += stat.damage_blocked;
    totals.heroTimes.set(
      stat.player_hero,
      (totals.heroTimes.get(stat.player_hero) ?? 0) + stat.hero_time_played
    );
    totalsByPlayer.set(stat.player_name, totals);
  }

  const baselineKeys = new Map<
    string,
    { hero: HeroName; stat: OutlierStatDef }
  >();
  const playerContexts = Array.from(totalsByPlayer.values()).flatMap(
    (totals) => {
      const primaryHero =
        Array.from(totals.heroTimes.entries()).sort(
          (a, b) => b[1] - a[1]
        )[0]?.[0] ?? "Unknown";
      const role = determineRole(primaryHero as HeroName);
      const statDefs = statDefsForRole(role);
      for (const stat of statDefs) {
        baselineKeys.set(`${primaryHero}\0${stat.key}`, {
          hero: primaryHero as HeroName,
          stat,
        });
      }
      return [{ totals, primaryHero, role, statDefs }];
    }
  );

  const baselines = new Map<string, StatDistributionBaseline>();
  await Promise.all(
    Array.from(baselineKeys.entries()).map(async ([key, entry]) => {
      if (entry.hero === ("Unknown" as HeroName)) return;
      const baseline = await getStatDistributionBaseline({
        hero: entry.hero,
        stat: entry.stat.key,
        minMaps: 5,
        minTimeSeconds: 300,
      });
      if (baseline) baselines.set(key, baseline);
    })
  );

  const rows: ComputedRow[] = [];
  for (const { totals, primaryHero, role, statDefs } of playerContexts) {
    if (totals.timePlayed < 300) continue;
    for (const stat of statDefs) {
      const value = per10(Number(totals[stat.column]), totals.timePlayed);
      const baseline = baselines.get(`${primaryHero}\0${stat.key}`);
      if (!baseline) continue;
      const z = zScore(baseline, stat, value);
      if (z == null) continue;
      const percentile = Math.round(normalCdf(z) * 1000) / 10;
      rows.push({
        player: totals.player,
        stat: stat.label,
        stat_key: stat.key,
        primary_hero: primaryHero,
        role:
          role === "Tank" || role === "Damage" || role === "Support"
            ? role
            : "Flex",
        direction: z >= 0 ? "high" : "low",
        outlier: Math.abs(z) >= OUTLIER_THRESHOLD ? "yes" : "no",
        maps: totals.maps.size,
        hero_time_played: totals.timePlayed,
        per10_value: value,
        baseline_per10: baseline.hero_avg_per10,
        baseline_stddev: baseline.hero_std_per10,
        z_score: z,
        abs_z_score: Math.abs(z),
        percentile,
        sample_players: baseline.total_players,
      });
    }
  }

  return rows;
}
