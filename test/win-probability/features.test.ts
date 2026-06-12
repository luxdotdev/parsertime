import {
  extractFeatures,
  FEATURE_NAMES,
  featureHash,
} from "@/lib/win-probability/features";
import type { GameState } from "@/lib/win-probability/types";
import { describe, expect, test } from "vitest";

const state: GameState = {
  modeFamily: "control",
  matchTime: 120,
  roundNumber: 1,
  aliveDiff: 2,
  ultBankDiff: -1,
  scoreDiff: 0,
  objProgressOwn: 0.5,
  objProgressEnemy: 0.9,
  timeRemaining: 300,
  isAttacker: 0,
};

describe("extractFeatures", () => {
  test("vector aligns with FEATURE_NAMES and computes interactions", () => {
    const vec = extractFeatures(state);
    expect(vec).toHaveLength(FEATURE_NAMES.length);
    const f = Object.fromEntries(FEATURE_NAMES.map((n, i) => [n, vec[i]]));
    expect(f.aliveDiff).toBe(2);
    expect(f.ultBankDiff).toBe(-1);
    expect(f.timeRemainingNorm).toBeCloseTo(0.5); // 300/600
    expect(f.aliveDiff_x_objMax).toBeCloseTo(2 * 0.9);
    expect(f.ultBankDiff_x_timeRemaining).toBeCloseTo(-0.5);
  });

  test("timeRemainingNorm clamps at 1", () => {
    const vec = extractFeatures({ ...state, timeRemaining: 1200 });
    const idx = FEATURE_NAMES.indexOf("timeRemainingNorm");
    expect(vec[idx]).toBe(1);
  });
});

describe("featureHash", () => {
  test("is stable and 12 hex chars", () => {
    expect(featureHash()).toMatch(/^[0-9a-f]{12}$/);
    expect(featureHash()).toBe(featureHash());
  });
});
