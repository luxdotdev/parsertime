import { FEATURE_NAMES, featureHash } from "@/lib/win-probability/features";
import {
  type ModelArtifact,
  predictWinProbability,
  WPModelMismatchError,
} from "@/lib/win-probability/model";
import { describe, expect, test } from "vitest";

const DIMS = FEATURE_NAMES.length;

/** Zero vector with aliveDiff (index 0) set. */
function vec(aliveDiff: number): number[] {
  const v = new Array<number>(DIMS).fill(0);
  v[0] = aliveDiff;
  return v;
}

function artifact(overrides: Partial<ModelArtifact> = {}): ModelArtifact {
  return {
    schemaVersion: 1,
    modelVersion: 1,
    createdAt: "2026-06-12T00:00:00.000Z",
    featureHash: featureHash(),
    modeFamilies: {
      control: {
        // Identity scaling; weight 1 on aliveDiff only, bias 0.
        weights: vec(1),
        bias: 0,
        means: new Array<number>(DIMS).fill(0),
        stds: new Array<number>(DIMS).fill(1),
        sampleCount: 50_000,
      },
      escort_hybrid: null,
      push: null,
      flashpoint: null,
    },
    ...overrides,
  };
}

describe("predictWinProbability", () => {
  test("neutral state → 0.5; advantage raises WP symmetrically", () => {
    const a = artifact();
    expect(predictWinProbability(a, "control", vec(0))).toBeCloseTo(0.5);
    const p = predictWinProbability(a, "control", vec(2))!;
    const q = predictWinProbability(a, "control", vec(-2))!;
    expect(p).toBeGreaterThan(0.85);
    expect(p + q).toBeCloseTo(1);
  });

  test("returns null for a family with no model", () => {
    expect(predictWinProbability(artifact(), "push", vec(0))).toBeNull();
  });

  test("throws WPModelMismatchError on feature hash mismatch", () => {
    const stale = artifact({ featureHash: "deadbeef0000" });
    expect(() => predictWinProbability(stale, "control", vec(0))).toThrow(
      WPModelMismatchError
    );
  });

  test("throws WPModelMismatchError on feature length mismatch", () => {
    expect(() => predictWinProbability(artifact(), "control", [0, 0])).toThrow(
      WPModelMismatchError
    );
  });

  test("applies the calibration map when present", () => {
    const a = artifact();
    // Map everything to 0.5 — flat calibration.
    a.modeFamilies.control!.calibration = { x: [0, 1], y: [0.5, 0.5] };
    expect(predictWinProbability(a, "control", vec(2))).toBeCloseTo(0.5);
  });
});
