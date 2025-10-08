import {
  compareMultipleStatsToDistribution,
  type ValidStatColumn,
} from "@/lib/stat-percentiles";
import type { HeroName } from "@/types/heroes";

export type StatCardComparison = {
  per10Value: number;
  heroAverage: number;
  zScore: number;
  percentile: number;
};

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

    return {
      per10Value: Number(comparison.input_per10),
      heroAverage: Number(comparison.hero_avg_per10),
      zScore: Number(comparison.z_score),
      percentile: Number(comparison.estimated_percentile),
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
      result.set(comparison.stat, {
        per10Value: Number(comparison.input_per10),
        heroAverage: Number(comparison.hero_avg_per10),
        zScore: Number(comparison.z_score),
        percentile: Number(comparison.estimated_percentile),
      });
    }
  } catch {
    // Return empty map on error
  }

  return result;
}
