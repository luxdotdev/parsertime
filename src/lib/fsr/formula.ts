import {
  TIER_PRIORS,
  scaleAdjustedCsrPeerDelta,
  tierWeight,
} from "@/lib/fsr/constants";
import type { AnchoredTier, FsrStatColumn, FsrStatConfig } from "@/lib/fsr/types";

const FSR_FLOOR = 1;
const FSR_CEILING = 5000;

/** Recency-weighted per-10-minute rate. weightedTimeSeconds is the recency-weighted sum of timePlayed. */
export function statPer10(weightedSum: number, weightedTimeSeconds: number): number {
  if (weightedTimeSeconds <= 0) return 0;
  return (weightedSum / weightedTimeSeconds) * 600;
}

export function zScore(
  value: number,
  mean: number,
  stddev: number,
  invert: boolean
): number {
  if (!stddev || stddev === 0) return 0;
  return invert ? (mean - value) / stddev : (value - mean) / stddev;
}

export function shrink(n: number, k: number): number {
  return n / (n + k);
}

/** Sum of (per-stat z-score × weight), then shrunk toward 0 by sample size. */
export function compositeZScore(
  zByStat: Partial<Record<FsrStatColumn, number>>,
  configs: FsrStatConfig[],
  mapCount: number,
  shrinkK: number
): number {
  const raw = configs.reduce(
    (sum, c) => sum + (zByStat[c.column] ?? 0) * c.weight,
    0
  );
  return raw * shrink(mapCount, shrinkK);
}

export function clampFsr(value: number): number {
  return Math.max(FSR_FLOOR, Math.min(FSR_CEILING, Math.round(value)));
}

export function tierCellFsr(tier: AnchoredTier, compositeZ: number): number {
  return clampFsr(TIER_PRIORS[tier] + scaleAdjustedCsrPeerDelta(compositeZ));
}

export type HeadlineInput = {
  tier: AnchoredTier;
  compositeZ: number;
  sumRecency: number;
};

export type HeadlineResult = {
  fsr: number;
  anchor: number;
  zBlend: number;
};

/** Tier-anchored blend: weight each tier by recency × tierWeight. */
export function blendHeadline(cells: HeadlineInput[]): HeadlineResult {
  if (cells.length === 0) {
    return { fsr: 1, anchor: 1, zBlend: 0 };
  }
  let wSum = 0;
  let anchorAcc = 0;
  let zAcc = 0;
  for (const cell of cells) {
    const w = cell.sumRecency * tierWeight(cell.tier);
    wSum += w;
    anchorAcc += w * TIER_PRIORS[cell.tier];
    zAcc += w * cell.compositeZ;
  }
  if (wSum <= 0) {
    const firstTier = cells[0].tier;
    return {
      fsr: clampFsr(TIER_PRIORS[firstTier]),
      anchor: TIER_PRIORS[firstTier],
      zBlend: 0,
    };
  }
  const anchor = Math.round(anchorAcc / wSum);
  const zBlend = zAcc / wSum;
  return {
    fsr: clampFsr(anchor + scaleAdjustedCsrPeerDelta(zBlend)),
    anchor,
    zBlend,
  };
}
