export const CALIBRATION_BIN_MIN_SAMPLES = 200;
export const CALIBRATION_MAX_DEVIATION = 0.1;

export type CalibrationBin = {
  lo: number;
  hi: number;
  meanPred: number;
  meanLabel: number;
  n: number;
};

const EPS = 1e-12;

export function logLoss(preds: number[], labels: number[]): number {
  let sum = 0;
  for (let i = 0; i < preds.length; i++) {
    const p = Math.min(1 - EPS, Math.max(EPS, preds[i]));
    sum += labels[i] === 1 ? -Math.log(p) : -Math.log(1 - p);
  }
  return sum / preds.length;
}

export function brier(preds: number[], labels: number[]): number {
  let sum = 0;
  for (let i = 0; i < preds.length; i++) sum += (preds[i] - labels[i]) ** 2;
  return sum / preds.length;
}

export function calibrationBins(
  preds: number[],
  labels: number[],
  k: number
): CalibrationBin[] {
  const bins: CalibrationBin[] = Array.from({ length: k }, (_, i) => ({
    lo: i / k,
    hi: (i + 1) / k,
    meanPred: 0,
    meanLabel: 0,
    n: 0,
  }));
  for (let i = 0; i < preds.length; i++) {
    const idx = Math.min(k - 1, Math.floor(preds[i] * k));
    const bin = bins[idx];
    bin.meanPred += preds[i];
    bin.meanLabel += labels[i];
    bin.n++;
  }
  for (const bin of bins) {
    if (bin.n > 0) {
      bin.meanPred /= bin.n;
      bin.meanLabel /= bin.n;
    }
  }
  return bins;
}

export type GateInput = {
  logLoss: number;
  baseRate: number;
  bins: CalibrationBin[];
};

export type GateResult = { pass: boolean; failures: string[] };

/** The deploy gate: a failing artifact must never advance the R2 pointer. */
export function checkGates(input: GateInput): GateResult {
  const failures: string[] = [];
  const p = Math.min(1 - EPS, Math.max(EPS, input.baseRate));
  const baselineLogLoss = -(p * Math.log(p) + (1 - p) * Math.log(1 - p));
  if (input.logLoss >= baselineLogLoss) {
    failures.push(
      `log loss ${input.logLoss.toFixed(4)} does not beat base rate baseline ${baselineLogLoss.toFixed(4)}`
    );
  }
  for (const bin of input.bins) {
    if (bin.n < CALIBRATION_BIN_MIN_SAMPLES) continue;
    const dev = Math.abs(bin.meanPred - bin.meanLabel);
    if (dev > CALIBRATION_MAX_DEVIATION) {
      failures.push(
        `calibration bin [${bin.lo.toFixed(1)}, ${bin.hi.toFixed(1)}) off by ${(dev * 100).toFixed(1)} points (n=${bin.n})`
      );
    }
  }
  return { pass: failures.length === 0, failures };
}
