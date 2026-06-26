export type FitOptions = {
  learningRate: number;
  epochs: number;
  l2: number;
};

export type FitResult = { weights: number[]; bias: number };

export function standardize(X: number[][]): {
  Xs: number[][];
  means: number[];
  stds: number[];
} {
  const n = X.length;
  const d = X[0]?.length ?? 0;
  const means = new Array<number>(d).fill(0);
  const stds = new Array<number>(d).fill(0);
  for (const row of X) for (let j = 0; j < d; j++) means[j] += row[j] / n;
  for (const row of X) {
    for (let j = 0; j < d; j++) stds[j] += (row[j] - means[j]) ** 2 / n;
  }
  for (let j = 0; j < d; j++) {
    stds[j] = Math.sqrt(stds[j]);
    if (stds[j] === 0) stds[j] = 1;
  }
  const Xs = X.map((row) => row.map((v, j) => (v - means[j]) / stds[j]));
  return { Xs, means, stds };
}

/** Full-batch GD on already-standardized X. Deterministic: zero init. */
export function fitLogisticRegression(
  X: number[][],
  y: number[],
  opts: FitOptions
): FitResult {
  const n = X.length;
  const d = X[0]?.length ?? 0;
  const w = new Array<number>(d).fill(0);
  let b = 0;
  for (let epoch = 0; epoch < opts.epochs; epoch++) {
    const gw = new Array<number>(d).fill(0);
    let gb = 0;
    for (let i = 0; i < n; i++) {
      let z = b;
      for (let j = 0; j < d; j++) z += w[j] * X[i][j];
      const err = 1 / (1 + Math.exp(-z)) - y[i];
      for (let j = 0; j < d; j++) gw[j] += (err * X[i][j]) / n;
      gb += err / n;
    }
    for (let j = 0; j < d; j++) {
      w[j] -= opts.learningRate * (gw[j] + opts.l2 * w[j]);
    }
    b -= opts.learningRate * gb;
  }
  return { weights: w, bias: b };
}
