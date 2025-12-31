export type DistributionData = {
  sr: number;
  frequency: number;
};

export type PlayerPoint = {
  sr: number;
  player_name: string;
  rank: number;
};

export function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return sum / values.length;
}

export function calculateStandardDeviation(
  values: number[],
  mean?: number
): number {
  if (values.length === 0) return 0;
  const avg = mean ?? calculateMean(values);
  const squareDiffs = values.map((value) => Math.pow(value - avg, 2));
  const avgSquareDiff = calculateMean(squareDiffs);
  return Math.sqrt(avgSquareDiff);
}

export function normalDistribution(
  x: number,
  mean: number,
  stdDev: number
): number {
  if (stdDev === 0) return 0;
  const exponent = -Math.pow(x - mean, 2) / (2 * Math.pow(stdDev, 2));
  return (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);
}

export function generateBellCurveData(
  mean: number,
  stdDev: number,
  minSR = 1000,
  maxSR = 4000,
  points = 100
): DistributionData[] {
  const step = (maxSR - minSR) / points;
  const data: DistributionData[] = [];

  for (let i = 0; i <= points; i++) {
    const sr = minSR + i * step;
    const frequency = normalDistribution(sr, mean, stdDev);
    data.push({ sr: Math.round(sr), frequency });
  }

  return data;
}

export function calculatePercentile(value: number, values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const belowCount = sorted.filter((v) => v < value).length;
  return (belowCount / values.length) * 100;
}

export function getPercentileLabel(percentile: number): string {
  if (percentile >= 99) return "Top 1%";
  if (percentile >= 95) return "Top 5%";
  if (percentile >= 90) return "Top 10%";
  if (percentile >= 75) return "Top 25%";
  if (percentile >= 50) return "Above Average";
  if (percentile >= 25) return "Average";
  return "Below Average";
}

export function getSRRange(
  mean: number,
  stdDev: number
): { min: number; max: number } {
  const min = Math.max(1000, Math.floor(mean - 4 * stdDev));
  const max = Math.min(5000, Math.ceil(mean + 4 * stdDev));
  return { min, max };
}
