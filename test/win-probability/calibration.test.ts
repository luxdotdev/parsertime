import {
  applyCalibration,
  fitCalibration,
} from "@/lib/win-probability/calibration";
import { describe, expect, test } from "vitest";

/** Deterministic LCG, as in lr.test.ts. */
function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

describe("fitCalibration + applyCalibration", () => {
  test("pulls overconfident extremes toward observed rates", () => {
    // True probability is shrunk toward 0.5 relative to the prediction —
    // the flashpoint failure shape (overconfident tails).
    const rng = makeRng(7);
    const preds: number[] = [];
    const labels: number[] = [];
    for (let i = 0; i < 50_000; i++) {
      const p = rng();
      const truth = 0.5 + (p - 0.5) * 0.6;
      preds.push(p);
      labels.push(rng() < truth ? 1 : 0);
    }
    const map = fitCalibration(preds, labels);
    expect(applyCalibration(map, 0.95)).toBeLessThan(0.85);
    expect(applyCalibration(map, 0.95)).toBeGreaterThan(0.7);
    expect(applyCalibration(map, 0.05)).toBeGreaterThan(0.15);
    expect(applyCalibration(map, 0.5)).toBeCloseTo(0.5, 1);
  });

  test("is near-identity on already calibrated predictions", () => {
    const rng = makeRng(11);
    const preds: number[] = [];
    const labels: number[] = [];
    for (let i = 0; i < 50_000; i++) {
      const p = rng();
      preds.push(p);
      labels.push(rng() < p ? 1 : 0);
    }
    const map = fitCalibration(preds, labels);
    for (const p of [0.1, 0.3, 0.5, 0.7, 0.9]) {
      expect(Math.abs(applyCalibration(map, p) - p)).toBeLessThan(0.05);
    }
  });

  test("output is monotone even when bin means invert", () => {
    // Construct a deliberate inversion: high preds with low observed rate.
    const preds = [
      ...Array.from({ length: 400 }, () => 0.15),
      ...Array.from({ length: 400 }, () => 0.25),
    ];
    const labels = [
      ...Array.from({ length: 400 }, (_, i) => (i < 240 ? 1 : 0)), // obs 0.6
      ...Array.from({ length: 400 }, (_, i) => (i < 100 ? 1 : 0)), // obs 0.25
    ];
    const map = fitCalibration(preds, labels);
    expect(applyCalibration(map, 0.25)).toBeGreaterThanOrEqual(
      applyCalibration(map, 0.15) - 1e-9
    );
  });

  test("clamps outside the fitted range and stays within [0,1]", () => {
    const map = fitCalibration(
      [0.4, 0.4, 0.6, 0.6],
      [0, 1, 1, 1]
    );
    expect(applyCalibration(map, 0)).toBeGreaterThanOrEqual(0);
    expect(applyCalibration(map, 1)).toBeLessThanOrEqual(1);
  });
});
