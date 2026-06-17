import {
  brier,
  calibrationBins,
  checkGates,
  logLoss,
} from "@/lib/win-probability/training/metrics";
import { describe, expect, test } from "vitest";

describe("logLoss and brier", () => {
  test("perfect predictions score near 0; coin flips score ln2 / 0.25", () => {
    expect(logLoss([0.999, 0.001], [1, 0])).toBeLessThan(0.01);
    expect(logLoss([0.5, 0.5], [1, 0])).toBeCloseTo(Math.log(2));
    expect(brier([0.5, 0.5], [1, 0])).toBeCloseTo(0.25);
  });
});

describe("calibrationBins", () => {
  test("groups by predicted probability and reports observed rates", () => {
    const preds = [0.05, 0.05, 0.95, 0.95];
    const labels = [0, 0, 1, 1];
    const bins = calibrationBins(preds, labels, 10);
    expect(bins).toHaveLength(10);
    expect(bins[0].n).toBe(2);
    expect(bins[0].meanLabel).toBe(0);
    expect(bins[9].n).toBe(2);
    expect(bins[9].meanLabel).toBe(1);
  });
});

describe("checkGates", () => {
  const wellCalibrated = {
    logLoss: 0.5,
    baseRate: 0.5,
    bins: [{ lo: 0.4, hi: 0.5, meanPred: 0.45, meanLabel: 0.44, n: 500 }],
  };

  test("passes a calibrated model that beats the base rate", () => {
    expect(checkGates(wellCalibrated).pass).toBe(true);
  });

  test("fails when a supported bin deviates more than 10 points", () => {
    const bad = {
      ...wellCalibrated,
      bins: [{ lo: 0.4, hi: 0.5, meanPred: 0.45, meanLabel: 0.6, n: 500 }],
    };
    const result = checkGates(bad);
    expect(result.pass).toBe(false);
    expect(result.failures[0]).toContain("calibration");
  });

  test("ignores under-supported bins", () => {
    const thin = {
      ...wellCalibrated,
      bins: [{ lo: 0.4, hi: 0.5, meanPred: 0.45, meanLabel: 0.9, n: 50 }],
    };
    expect(checkGates(thin).pass).toBe(true);
  });

  test("fails when log loss does not beat the base-rate baseline", () => {
    // base rate 0.5 → baseline log loss = ln2 ≈ 0.693
    const worse = { ...wellCalibrated, logLoss: 0.7 };
    const result = checkGates(worse);
    expect(result.pass).toBe(false);
    expect(result.failures[0]).toContain("base rate");
  });
});
