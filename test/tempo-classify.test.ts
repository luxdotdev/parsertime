import {
  classifyTempo,
  formatDelta,
  MIN_SAMPLE_FOR_READ,
  type TempoBaselineStat,
} from "@/lib/tempo/classify";
import { expect, test } from "vitest";

const base: TempoBaselineStat = {
  mean: 24,
  stdDev: 4,
  sampleN: MIN_SAMPLE_FOR_READ,
};

test("classifies within +/-0.5 sigma as about average", () => {
  // 0.5 sigma = 2.0; 25 is +0.25 sigma
  expect(classifyTempo(25, base)).toEqual({ bucket: "about", deltaVsAvg: 1 });
});

test("classifies at or below -0.5 sigma as faster", () => {
  expect(classifyTempo(22, base)?.bucket).toBe("faster"); // exactly -0.5 sigma
  expect(classifyTempo(20, base)?.bucket).toBe("faster");
});

test("classifies at or above +0.5 sigma as slower", () => {
  expect(classifyTempo(26, base)?.bucket).toBe("slower"); // exactly +0.5 sigma
  expect(classifyTempo(30, base)?.bucket).toBe("slower");
});

test("returns null when baseline is missing", () => {
  expect(classifyTempo(25, undefined)).toBeNull();
  expect(classifyTempo(25, null)).toBeNull();
});

test("returns null when sample size is below the read floor", () => {
  expect(
    classifyTempo(30, { ...base, sampleN: MIN_SAMPLE_FOR_READ - 1 })
  ).toBeNull();
});

test("zero stdDev falls back to about (no divide-by-zero)", () => {
  expect(classifyTempo(30, { mean: 24, stdDev: 0, sampleN: 50 })).toEqual({
    bucket: "about",
    deltaVsAvg: 6,
  });
});

test("formatDelta signs and rounds to one decimal", () => {
  expect(formatDelta(2.34)).toBe("+2.3");
  expect(formatDelta(-1.55)).toBe("-1.6");
  expect(formatDelta(0)).toBe("+0.0");
  expect(formatDelta(-0.04)).toBe("+0.0");
  expect(formatDelta(-0.0)).toBe("+0.0");
});
