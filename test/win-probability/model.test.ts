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

function gbmArtifact(family: Partial<ModelArtifact["modeFamilies"]>): ModelArtifact {
  return {
    schemaVersion: 1,
    modelVersion: 99,
    createdAt: "2026-06-14T00:00:00.000Z",
    featureHash: featureHash(),
    modeFamilies: { control: null, escort_hybrid: null, push: null, flashpoint: null, ...family },
  };
}

// One stump: feature 0 <= 0.5 → leaf -1, else leaf +1. baseScore 0.
const STUMP = {
  kind: "gbm" as const,
  baseScore: 0,
  sampleCount: 1000,
  trees: [[
    { feature: 0, threshold: 0.5, left: 1, right: 2, defaultLeft: true },
    { leaf: -1 },
    { leaf: 1 },
  ]],
};

describe("GBM tree inference", () => {
  test("traverses left/right by threshold and sigmoids the leaf sum", () => {
    const art = gbmArtifact({ control: STUMP });
    const zeros = Array(FEATURE_NAMES.length - 1).fill(0) as number[];
    expect(predictWinProbability(art, "control", [0, ...zeros])).toBeCloseTo(1 / (1 + Math.exp(1)), 6);
    expect(predictWinProbability(art, "control", [1, ...zeros])).toBeCloseTo(1 / (1 + Math.exp(-1)), 6);
  });

  test("sums leaves across trees and adds baseScore", () => {
    const twoTree = { ...STUMP, baseScore: 0.5, trees: [STUMP.trees[0], STUMP.trees[0]] };
    const art = gbmArtifact({ control: twoTree });
    const feats = [1, ...Array(FEATURE_NAMES.length - 1).fill(0)];
    expect(predictWinProbability(art, "control", feats)).toBeCloseTo(1 / (1 + Math.exp(-2.5)), 6);
  });

  test("NaN feature follows defaultLeft", () => {
    const art = gbmArtifact({ control: STUMP });
    const feats = [NaN, ...Array(FEATURE_NAMES.length - 1).fill(0)];
    expect(predictWinProbability(art, "control", feats)).toBeCloseTo(1 / (1 + Math.exp(1)), 6);
  });

  test("a kind-less family is treated as LR (backward compat)", () => {
    const lr = {
      weights: Array(FEATURE_NAMES.length).fill(0),
      bias: 0, means: Array(FEATURE_NAMES.length).fill(0),
      stds: Array(FEATURE_NAMES.length).fill(1), sampleCount: 1,
    };
    const art = gbmArtifact({ control: lr as unknown as ModelArtifact["modeFamilies"]["control"] });
    expect(predictWinProbability(art, "control", Array(FEATURE_NAMES.length).fill(0))).toBeCloseTo(0.5, 6);
  });
});
