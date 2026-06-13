import { FEATURE_NAMES, featureHash } from "@/lib/win-probability/features";
import {
  buildArtifact,
  trainFamily,
} from "@/lib/win-probability/training/train-core";
import type { DatasetRow } from "@/lib/win-probability/types";
import { describe, expect, test } from "vitest";

/** Separable synthetic rows: feature[0] (tankAliveDiff position) drives the label. */
function syntheticRows(count: number): DatasetRow[] {
  const rows: DatasetRow[] = [];
  for (let i = 0; i < count; i++) {
    const adv = (i % 5) - 2;
    const features = new Array<number>(FEATURE_NAMES.length).fill(0);
    features[0] = adv;
    rows.push({
      matchId: Math.floor(i / 40) + 1,
      roundId: `${Math.floor(i / 40) + 1}-1`,
      label: adv > 0 ? 1 : 0,
      features,
    });
  }
  return rows;
}

describe("trainFamily", () => {
  test(
    "returns a calibrated model with positive feature[0] weight on separable data",
    { timeout: 20_000 },
    () => {
      const result = trainFamily(syntheticRows(8000));
      expect(result.model).not.toBeNull();
      expect(result.model!.weights[0]).toBeGreaterThan(0);
      expect(result.model!.sampleCount).toBe(8000);
      expect(result.model!.calibration).toBeDefined();
      expect(result.model!.metrics).toBeDefined();
      expect(result.report.length).toBeGreaterThan(0);
    }
  );

  test("returns null below MIN_FAMILY_ROWS", () => {
    expect(trainFamily(syntheticRows(100)).model).toBeNull();
  });

  test("returns null when row count passes but distinct map count is too low", () => {
    // 6000 rows spread over only 10 distinct matchIds — passes MIN_FAMILY_ROWS
    // but must be blocked by the new MIN_FAMILY_MAPS gate.
    const rows: DatasetRow[] = [];
    for (let i = 0; i < 6000; i++) {
      const adv = (i % 5) - 2;
      const features = new Array<number>(FEATURE_NAMES.length).fill(0);
      features[0] = adv;
      rows.push({
        matchId: Math.floor(i / 600) + 1, // 10 distinct matchIds
        roundId: `${Math.floor(i / 600) + 1}-1`,
        label: adv > 0 ? 1 : 0,
        features,
      });
    }
    const result = trainFamily(rows);
    expect(result.model).toBeNull();
    expect(result.report.some((line) => line.includes("MIN_FAMILY_MAPS"))).toBe(
      true
    );
  });
});

describe("buildArtifact", () => {
  test(
    "assembles an artifact with the current feature hash and null thin families",
    { timeout: 20_000 },
    () => {
      const { artifact, trainedFamilies } = buildArtifact(
        {
          control: syntheticRows(8000),
          escort_hybrid: [],
          push: [],
          flashpoint: [],
        },
        3
      );
      expect(artifact.featureHash).toBe(featureHash());
      expect(artifact.modelVersion).toBe(3);
      expect(artifact.modeFamilies.control).not.toBeNull();
      expect(artifact.modeFamilies.push).toBeNull();
      expect(trainedFamilies).toEqual(["control"]);
    }
  );
});
