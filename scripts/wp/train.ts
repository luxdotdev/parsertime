#!/usr/bin/env bun

import { featureHash, FEATURE_NAMES } from "@/lib/win-probability/features";
import type { FamilyModel, ModelArtifact } from "@/lib/win-probability/model";
import { runGroupedCV } from "@/lib/win-probability/training/cv";
import {
  fitLogisticRegression,
  standardize,
} from "@/lib/win-probability/training/lr";
import { checkGates } from "@/lib/win-probability/training/metrics";
import {
  type DatasetRow,
  MODE_FAMILIES,
  type ModeFamily,
} from "@/lib/win-probability/types";
import * as fs from "node:fs";
import * as path from "node:path";

const OUT_DIR = "artifacts/wp";
const MIN_FAMILY_ROWS = 5000;
const FIT = { learningRate: 0.5, epochs: 300, l2: 1e-4 };

function readCsv(family: ModeFamily): DatasetRow[] {
  const file = path.join(OUT_DIR, `dataset-${family}.csv`);
  if (!fs.existsSync(file)) return [];
  const lines = fs.readFileSync(file, "utf8").trim().split("\n").slice(1);
  return lines.map((line) => {
    const parts = line.split(",");
    return {
      matchId: Number(parts[0]),
      roundId: parts[1],
      label: Number(parts[2]) as 0 | 1,
      features: parts.slice(3).map(Number),
    };
  });
}

function trainFamily(family: ModeFamily): FamilyModel | null {
  const rows = readCsv(family);
  console.log(`\n=== ${family}: ${rows.length} rows ===`);
  if (rows.length < MIN_FAMILY_ROWS) {
    console.log(
      `  below MIN_FAMILY_ROWS (${MIN_FAMILY_ROWS}) — family disabled`
    );
    return null;
  }

  const cv = runGroupedCV(rows, 5, FIT);
  console.log(
    `  CV log loss ${cv.pooled.logLoss.toFixed(4)}, Brier ${cv.pooled.brier.toFixed(4)}, base rate ${cv.pooled.baseRate.toFixed(3)}`
  );
  console.log("  calibration (bins with n>0):");
  for (const bin of cv.pooled.bins) {
    if (bin.n === 0) continue;
    console.log(
      `    [${bin.lo.toFixed(1)},${bin.hi.toFixed(1)}) pred ${bin.meanPred.toFixed(3)} obs ${bin.meanLabel.toFixed(3)} n=${bin.n}`
    );
  }

  const gates = checkGates({
    logLoss: cv.pooled.logLoss,
    baseRate: cv.pooled.baseRate,
    bins: cv.pooled.bins,
  });
  if (!gates.pass) {
    for (const failure of gates.failures) {
      console.error(`  GATE FAIL: ${failure}`);
    }
    return null;
  }

  const { Xs, means, stds } = standardize(rows.map((r) => r.features));
  const { weights, bias } = fitLogisticRegression(
    Xs,
    rows.map((r) => r.label),
    FIT
  );
  console.log("  weights:");
  FEATURE_NAMES.forEach((name, i) => {
    console.log(`    ${name}: ${weights[i].toFixed(4)}`);
  });
  return {
    weights,
    bias,
    means,
    stds,
    sampleCount: rows.length,
    metrics: {
      logLoss: cv.pooled.logLoss,
      brier: cv.pooled.brier,
      baseRate: cv.pooled.baseRate,
    },
  };
}

function main() {
  const modeFamilies = {} as ModelArtifact["modeFamilies"];
  for (const family of MODE_FAMILIES) {
    modeFamilies[family] = trainFamily(family);
  }

  const trained = MODE_FAMILIES.filter((f) => modeFamilies[f] !== null);
  if (trained.length === 0) {
    console.error("\nNo family passed gates — refusing to write an artifact.");
    process.exit(1);
  }

  const artifact: ModelArtifact = {
    schemaVersion: 1,
    modelVersion: 1,
    createdAt: new Date().toISOString(),
    featureHash: featureHash(),
    modeFamilies,
  };
  const out = path.join(OUT_DIR, "model-v1.json");
  fs.writeFileSync(out, JSON.stringify(artifact, null, 2));
  console.log(`\nWrote ${out} (families: ${trained.join(", ")})`);
}

main();
