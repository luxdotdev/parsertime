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
  estimatedSR: number;
};

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
