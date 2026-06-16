import type { DatasetRow } from "@/lib/win-probability/types";
import { type FitOptions, fitLogisticRegression, standardize } from "./lr";
import {
  brier,
  type CalibrationBin,
  calibrationBins,
  logLoss,
} from "./metrics";

/** Stable FNV-1a over the decimal matchId string. */
export function groupFold(matchId: number, k: number): number {
  const s = String(matchId);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h % k;
}

export type CVResult = {
  folds: {
    fold: number;
    logLoss: number;
    brier: number;
    validationCount: number;
  }[];
  pooled: {
    logLoss: number;
    brier: number;
    bins: CalibrationBin[];
    baseRate: number;
    /** Held-out predictions/labels across all folds — calibration input. */
    preds: number[];
    labels: number[];
  };
};

export function runGroupedCV(
  rows: DatasetRow[],
  k: number,
  fit: FitOptions
): CVResult {
  const folds: CVResult["folds"] = [];
  const pooledPreds: number[] = [];
  const pooledLabels: number[] = [];

  for (let fold = 0; fold < k; fold++) {
    const train = rows.filter((r) => groupFold(r.matchId, k) !== fold);
    const val = rows.filter((r) => groupFold(r.matchId, k) === fold);
    if (val.length === 0 || train.length === 0) continue;

    const { Xs, means, stds } = standardize(train.map((r) => r.features));
    const { weights, bias } = fitLogisticRegression(
      Xs,
      train.map((r) => r.label),
      fit
    );
    const preds = val.map((r) => {
      let z = bias;
      for (let j = 0; j < weights.length; j++) {
        z += weights[j] * ((r.features[j] - means[j]) / stds[j]);
      }
      return 1 / (1 + Math.exp(-z));
    });
    const labels = val.map((r) => r.label);
    folds.push({
      fold,
      logLoss: logLoss(preds, labels),
      brier: brier(preds, labels),
      validationCount: val.length,
    });
    pooledPreds.push(...preds);
    pooledLabels.push(...labels);
  }

  const baseRate =
    pooledLabels.reduce((a, b) => a + b, 0) / Math.max(1, pooledLabels.length);
  return {
    folds,
    pooled: {
      logLoss: logLoss(pooledPreds, pooledLabels),
      brier: brier(pooledPreds, pooledLabels),
      bins: calibrationBins(pooledPreds, pooledLabels, 10),
      baseRate,
      preds: pooledPreds,
      labels: pooledLabels,
    },
  };
}
