import {
  fitLogisticRegression,
  standardize,
} from "@/lib/win-probability/training/lr";
import { describe, expect, test } from "vitest";

/** Deterministic LCG so the test never flakes. */
function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

describe("standardize", () => {
  test("produces zero-mean unit-std columns and reports params", () => {
    const X = [
      [1, 10],
      [3, 30],
      [5, 50],
    ];
    const { Xs, means, stds } = standardize(X);
    expect(means[0]).toBeCloseTo(3);
    expect(Xs[0][0]).toBeCloseTo(-(2 / stds[0]));
    const colMean = (Xs[0][1] + Xs[1][1] + Xs[2][1]) / 3;
    expect(colMean).toBeCloseTo(0);
  });

  test("constant columns get std 1 to avoid division by zero", () => {
    const { stds } = standardize([
      [7, 1],
      [7, 2],
    ]);
    expect(stds[0]).toBe(1);
  });
});

describe("fitLogisticRegression", () => {
  test("recovers known coefficients from synthetic data", () => {
    const rng = makeRng(42);
    const trueW = [1.5, -0.8];
    const trueB = 0.3;
    const X: number[][] = [];
    const y: number[] = [];
    for (let i = 0; i < 8000; i++) {
      const x = [rng() * 4 - 2, rng() * 4 - 2];
      const z = trueB + trueW[0] * x[0] + trueW[1] * x[1];
      const p = 1 / (1 + Math.exp(-z));
      X.push(x);
      y.push(rng() < p ? 1 : 0);
    }
    const { weights, bias } = fitLogisticRegression(X, y, {
      learningRate: 0.5,
      epochs: 400,
      l2: 1e-4,
    });
    expect(weights[0]).toBeGreaterThan(1.2);
    expect(weights[0]).toBeLessThan(1.8);
    expect(weights[1]).toBeGreaterThan(-1.1);
    expect(weights[1]).toBeLessThan(-0.5);
    expect(bias).toBeGreaterThan(0.1);
    expect(bias).toBeLessThan(0.5);
  });
});
