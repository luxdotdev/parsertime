import {
  compareMultipleStatsToDistribution,
  type ValidStatColumn,
} from "@/lib/stat-percentiles";
import type { HeroName } from "@/types/heroes";
import { heroRoleMapping } from "@/types/heroes";

export type StatCardComparison = {
  per10Value: number;
  heroAverage: number;
  zScore: number;
  percentile: number;
  estimatedSR: number;
};

type StatConfig = {
  column: ValidStatColumn;
  weight: number;
  invert?: boolean;
};

const ROLE_STAT_CONFIGS: Record<"Tank" | "Damage" | "Support", StatConfig[]> = {
  Damage: [
    { column: "eliminations", weight: 0.3 },
    { column: "final_blows", weight: 0.2 },
    { column: "deaths", weight: 0.2, invert: true },
    { column: "hero_damage_dealt", weight: 0.2 },
    { column: "solo_kills", weight: 0.1 },
  ],
  Tank: [
    { column: "eliminations", weight: 0.2 },
    { column: "final_blows", weight: 0.08 },
    { column: "deaths", weight: 0.3, invert: true },
    { column: "hero_damage_dealt", weight: 0.12 },
    { column: "damage_taken", weight: 0.12, invert: true },
    { column: "solo_kills", weight: 0.15 },
    { column: "ultimates_earned", weight: 0.03 },
  ],
  Support: [
    { column: "eliminations", weight: 0.1 },
    { column: "final_blows", weight: 0.05 },
    { column: "deaths", weight: 0.25, invert: true },
    { column: "hero_damage_dealt", weight: 0.14 },
    { column: "healing_dealt", weight: 0.35 },
    { column: "solo_kills", weight: 0.06 },
    { column: "ultimates_earned", weight: 0.05 },
  ],
};

const MERCY_STAT_CONFIG: StatConfig[] = [
  { column: "deaths", weight: 0.35, invert: true },
  { column: "hero_damage_dealt", weight: 0.25 },
  { column: "healing_dealt", weight: 0.35 },
  { column: "ultimates_earned", weight: 0.05 },
];

const NON_HEALING_SUPPORT_STAT_CONFIGS: StatConfig[] = [
  { column: "eliminations", weight: 0.1 },
  { column: "final_blows", weight: 0.05 },
  { column: "deaths", weight: 0.35, invert: true },
  { column: "hero_damage_dealt", weight: 0.34 },
  { column: "solo_kills", weight: 0.06 },
  { column: "ultimates_earned", weight: 0.11 },
];

function calculateEstimatedSR(zScore: number): number {
  const baseSR = 2500;
  const adjustment = zScore * (1250.0 / (1.0 + Math.abs(zScore) / 3.0));
  const estimatedSR = baseSR + adjustment;
  return Math.floor(Math.max(1, Math.min(5000, estimatedSR)));
}

export async function getStatComparison(
  hero: HeroName,
  stat: ValidStatColumn,
  value: number,
  timePlayedSeconds: number
): Promise<StatCardComparison | null> {
  try {
    const result = await compareMultipleStatsToDistribution({
      hero,
      stats: [{ stat, value }],
      timePlayedSeconds,
      minMaps: 5,
      minTimeSeconds: 300,
      sampleLimit: 150,
    });

    if (!result?.comparisons || result.comparisons.length === 0) {
      return null;
    }

    const comparison = result.comparisons[0];
    const zScore = Number(comparison.z_score);

    return {
      per10Value: Number(comparison.input_per10),
      heroAverage: Number(comparison.hero_avg_per10),
      zScore,
      percentile: Number(comparison.estimated_percentile),
      estimatedSR: calculateEstimatedSR(zScore),
    };
  } catch {
    return null;
  }
}

export async function getMultipleStatComparisons(
  hero: HeroName,
  stats: { stat: ValidStatColumn; value: number }[],
  timePlayedSeconds: number
): Promise<Map<ValidStatColumn, StatCardComparison>> {
  const result = new Map<ValidStatColumn, StatCardComparison>();

  try {
    const comparisonResult = await compareMultipleStatsToDistribution({
      hero,
      stats,
      timePlayedSeconds,
      minMaps: 5,
      minTimeSeconds: 300,
      sampleLimit: 150,
    });

    if (!comparisonResult?.comparisons) {
      return result;
    }

    for (const comparison of comparisonResult.comparisons) {
      const zScore = Number(comparison.z_score);
      result.set(comparison.stat, {
        per10Value: Number(comparison.input_per10),
        heroAverage: Number(comparison.hero_avg_per10),
        zScore,
        percentile: Number(comparison.estimated_percentile),
        estimatedSR: calculateEstimatedSR(zScore),
      });
    }
  } catch {
    // Return empty map on error
  }

  return result;
}

export async function calculateCompositeHeroSR(
  hero: HeroName,
  playerStats: Record<ValidStatColumn, number>,
  timePlayedSeconds: number
): Promise<number> {
  const role = heroRoleMapping[hero];

  let statConfigs: StatConfig[];
  switch (hero) {
    case "Mercy":
      statConfigs = MERCY_STAT_CONFIG;
      break;
    case "Juno":
    case "Wuyang":
      statConfigs = NON_HEALING_SUPPORT_STAT_CONFIGS;
      break;
    default:
      statConfigs = ROLE_STAT_CONFIGS[role];
      break;
  }

  const statsToCompare = statConfigs
    .map((config) => ({
      stat: config.column,
      value: playerStats[config.column] ?? 0,
    }))
    .filter((s) => s.value !== undefined);

  try {
    const comparisonResult = await compareMultipleStatsToDistribution({
      hero,
      stats: statsToCompare,
      timePlayedSeconds,
      minMaps: 5,
      minTimeSeconds: 300,
      sampleLimit: 150,
    });

    if (!comparisonResult?.comparisons) {
      return 0;
    }

    let compositeZScore = 0;
    for (const comparison of comparisonResult.comparisons) {
      const config = statConfigs.find((c) => c.column === comparison.stat);
      if (config) {
        const zScore = Number(comparison.z_score);
        const adjustedZScore = config.invert ? -zScore : zScore;
        compositeZScore += adjustedZScore * config.weight;
      }
    }

    return calculateEstimatedSR(compositeZScore);
  } catch {
    return 0;
  }
}
