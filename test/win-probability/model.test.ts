import { featureHash } from "@/lib/win-probability/features";
import {
  type ModelArtifact,
  predictWinProbability,
  WPModelMismatchError,
} from "@/lib/win-probability/model";
import { describe, expect, test } from "vitest";

function artifact(overrides: Partial<ModelArtifact> = {}): ModelArtifact {
  return {
    schemaVersion: 1,
    modelVersion: 1,
    createdAt: "2026-06-12T00:00:00.000Z",
    featureHash: featureHash(),
    modeFamilies: {
      control: {
        // Identity scaling; weight 1 on aliveDiff only, bias 0.
        weights: [1, 0, 0, 0, 0, 0, 0, 0, 0],
        bias: 0,
        means: [0, 0, 0, 0, 0, 0, 0, 0, 0],
        stds: [1, 1, 1, 1, 1, 1, 1, 1, 1],
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
    const neutral = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    const up2 = [2, 0, 0, 0, 0, 0, 0, 0, 0];
    const down2 = [-2, 0, 0, 0, 0, 0, 0, 0, 0];
    expect(predictWinProbability(a, "control", neutral)).toBeCloseTo(0.5);
    const p = predictWinProbability(a, "control", up2)!;
    const q = predictWinProbability(a, "control", down2)!;
    expect(p).toBeGreaterThan(0.85);
    expect(p + q).toBeCloseTo(1);
  });

  test("returns null for a family with no model", () => {
    expect(
      predictWinProbability(artifact(), "push", [0, 0, 0, 0, 0, 0, 0, 0, 0])
    ).toBeNull();
  });

  test("throws WPModelMismatchError on feature hash mismatch", () => {
    const stale = artifact({ featureHash: "deadbeef0000" });
    expect(() =>
      predictWinProbability(stale, "control", [0, 0, 0, 0, 0, 0, 0, 0, 0])
    ).toThrow(WPModelMismatchError);
  });

  test("throws WPModelMismatchError on feature length mismatch", () => {
    expect(() => predictWinProbability(artifact(), "control", [0, 0])).toThrow(
      WPModelMismatchError
    );
  });
});
