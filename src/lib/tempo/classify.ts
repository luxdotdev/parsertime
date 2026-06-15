/** Half-width of the "about average" band, in standard deviations. */
export const Z_BAND = 0.5;

/**
 * Minimum number of qualifying teams behind a baseline before we trust it enough
 * to show a read. Below this, components show the raw value with no read line.
 */
export const MIN_SAMPLE_FOR_READ = 10;

export type TempoBaselineStat = {
  mean: number;
  stdDev: number;
  sampleN: number;
};

export type TempoBucket = "faster" | "about" | "slower";

export type TempoRead = { bucket: TempoBucket; deltaVsAvg: number };

/**
 * Classify a team's value against the global baseline by z-score. All three
 * metrics are durations where a lower value means "faster", so the phrasing is
 * unified. Returns null when there is no trustworthy baseline.
 */
export function classifyTempo(
  value: number,
  baseline: TempoBaselineStat | null | undefined
): TempoRead | null {
  if (!baseline || baseline.sampleN < MIN_SAMPLE_FOR_READ) return null;
  const deltaVsAvg = value - baseline.mean;
  if (baseline.stdDev <= 0) return { bucket: "about", deltaVsAvg };
  const z = deltaVsAvg / baseline.stdDev;
  const bucket: TempoBucket =
    z <= -Z_BAND ? "faster" : z >= Z_BAND ? "slower" : "about";
  return { bucket, deltaVsAvg };
}

/** Signed, one-decimal delta string, e.g. "+2.3" or "-1.6". */
export function formatDelta(deltaVsAvg: number): string {
  const sign = deltaVsAvg >= 0 ? "+" : "-";
  return `${sign}${Math.abs(deltaVsAvg).toFixed(1)}`;
}
