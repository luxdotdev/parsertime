/** Monotone piecewise-linear recalibration map (isotonic regression knots). */
export type CalibrationMap = { x: number[]; y: number[] };

const FIT_BINS = 20;

/**
 * Fits an isotonic calibration map on held-out predictions: bin by predicted
 * probability, then pool adjacent violators (PAVA) so observed rates are
 * non-decreasing. Knots are (mean prediction, pooled observed rate).
 */
export function fitCalibration(
  preds: number[],
  labels: number[]
): CalibrationMap {
  type Block = { predSum: number; labelSum: number; n: number };
  const bins: Block[] = Array.from({ length: FIT_BINS }, () => ({
    predSum: 0,
    labelSum: 0,
    n: 0,
  }));
  for (let i = 0; i < preds.length; i++) {
    const idx = Math.min(FIT_BINS - 1, Math.floor(preds[i] * FIT_BINS));
    bins[idx].predSum += preds[i];
    bins[idx].labelSum += labels[i];
    bins[idx].n++;
  }

  // PAVA: merge any block whose observed rate undercuts its predecessor.
  const blocks: Block[] = [];
  for (const bin of bins) {
    if (bin.n === 0) continue;
    blocks.push({ ...bin });
    while (blocks.length >= 2) {
      const last = blocks[blocks.length - 1];
      const prev = blocks[blocks.length - 2];
      if (prev.labelSum / prev.n <= last.labelSum / last.n) break;
      prev.predSum += last.predSum;
      prev.labelSum += last.labelSum;
      prev.n += last.n;
      blocks.pop();
    }
  }

  return {
    x: blocks.map((b) => b.predSum / b.n),
    y: blocks.map((b) => b.labelSum / b.n),
  };
}

/** Piecewise-linear interpolation over the knots, clamped at the ends. */
export function applyCalibration(map: CalibrationMap, p: number): number {
  const { x, y } = map;
  if (x.length === 0) return p;
  if (p <= x[0]) return y[0];
  if (p >= x[x.length - 1]) return y[y.length - 1];
  let i = 1;
  while (x[i] < p) i++;
  const t = (p - x[i - 1]) / (x[i] - x[i - 1]);
  return y[i - 1] + t * (y[i] - y[i - 1]);
}
