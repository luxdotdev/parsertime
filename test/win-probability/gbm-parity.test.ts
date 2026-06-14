import { readFileSync } from "node:fs";
import { join } from "node:path";
import { featureHash } from "@/lib/win-probability/features";
import { predictWinProbability, type ModelArtifact } from "@/lib/win-probability/model";
import { describe, expect, test } from "vitest";

const fixture = JSON.parse(
  readFileSync(join(__dirname, "fixtures", "gbm-parity.json"), "utf8")
) as { family: ModelArtifact["modeFamilies"]["control"]; rows: number[][]; expectedProbs: number[] };

describe("GBM TS inference parity with LightGBM", () => {
  test("predictWinProbability matches LightGBM probabilities within 1e-6", () => {
    const art: ModelArtifact = {
      schemaVersion: 1, modelVersion: 99, createdAt: "x",
      featureHash: featureHash(),
      modeFamilies: { control: fixture.family, escort_hybrid: null, push: null, flashpoint: null },
    };
    fixture.rows.forEach((row, i) => {
      const p = predictWinProbability(art, "control", row);
      expect(p).not.toBeNull();
      expect(p as number).toBeCloseTo(fixture.expectedProbs[i], 6);
    });
  });
});
