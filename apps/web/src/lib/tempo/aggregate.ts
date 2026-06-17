/**
 * Teams below this all-time map count are excluded from every baseline so thin,
 * noisy samples do not skew the global mean.
 */
export const MIN_MAPS_FOR_BASELINE = 5;

export type TempoMetricKey =
  | "FIGHT_DURATION"
  | "ULT_CHARGE_TIME"
  | "ULT_HOLD_TIME";

export type TempoSummary = { mean: number; stdDev: number; sampleN: number };

/** One team's all-time tempo values. `fightDuration` is null when it has no fights. */
export type TeamTempoSample = {
  mapCount: number;
  fightDuration: number | null;
  chargeTime: number;
  holdTime: number;
};

/** Mean + population standard deviation + count over a list of observations. */
export function summarize(values: number[]): TempoSummary {
  const sampleN = values.length;
  if (sampleN === 0) return { mean: 0, stdDev: 0, sampleN: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / sampleN;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / sampleN;
  return { mean, stdDev: Math.sqrt(variance), sampleN };
}

/**
 * Turn per-team samples into the list of qualifying team values for each metric.
 * Teams under the map floor are dropped entirely; within a qualifying team, a
 * metric is included only when it is a valid positive observation (fight
 * duration may be null; charge/hold are 0 when absent).
 */
export function bucketTeamSamples(
  samples: TeamTempoSample[]
): Record<TempoMetricKey, number[]> {
  const out: Record<TempoMetricKey, number[]> = {
    FIGHT_DURATION: [],
    ULT_CHARGE_TIME: [],
    ULT_HOLD_TIME: [],
  };
  for (const s of samples) {
    if (s.mapCount < MIN_MAPS_FOR_BASELINE) continue;
    if (s.fightDuration !== null && s.fightDuration > 0) {
      out.FIGHT_DURATION.push(s.fightDuration);
    }
    if (s.chargeTime > 0) out.ULT_CHARGE_TIME.push(s.chargeTime);
    if (s.holdTime > 0) out.ULT_HOLD_TIME.push(s.holdTime);
  }
  return out;
}
