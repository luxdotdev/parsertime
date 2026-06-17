#!/usr/bin/env bun
/**
 * On-real-data TS↔Python parity check for the GBM artifact. Loads
 * artifacts/wp/model-gbm.json, reads each data/py_preds_<mode>.json (rows the
 * Python serving path scored), runs predictWinProbability through the SHIPPED
 * TS inference + isotonic, and asserts max |tsP - pyP| < 1e-6 per mode.
 */
import { featureHash } from "@/lib/win-probability/features";
import {
  predictWinProbability,
  type ModelArtifact,
} from "@/lib/win-probability/model";
import type { ModeFamily } from "@/lib/win-probability/types";
import * as fs from "node:fs";
import * as path from "node:path";

const FAMILIES: ModeFamily[] = ["control", "escort_hybrid", "flashpoint"];
const TOL = 1e-6;

const here = import.meta.dir;
const artPath = path.resolve(
  here,
  "..",
  "..",
  "..",
  "artifacts",
  "wp",
  "model-gbm.json"
);
const artifact = JSON.parse(fs.readFileSync(artPath, "utf8")) as ModelArtifact;

// The file already carries the literal hash; assert it matches the live code so
// predictWinProbability won't (correctly) refuse to load, then set it verbatim.
const liveHash = featureHash();
if (artifact.featureHash !== liveHash) {
  throw new Error(
    `artifact featureHash ${artifact.featureHash} != code ${liveHash}`
  );
}
artifact.featureHash = liveHash;

type PyPred = { row: number[]; p: number };

let allPass = true;
for (const fam of FAMILIES) {
  const preds = JSON.parse(
    fs.readFileSync(path.join(here, "data", `py_preds_${fam}.json`), "utf8")
  ) as PyPred[];
  let maxDiff = 0;
  let worst: { tsP: number; pyP: number; row: number[] } | null = null;
  for (const { row, p: pyP } of preds) {
    const tsP = predictWinProbability(artifact, fam, row);
    if (tsP === null)
      throw new Error(`${fam}: predictWinProbability returned null`);
    const diff = Math.abs(tsP - pyP);
    if (diff > maxDiff) {
      maxDiff = diff;
      worst = { tsP, pyP, row };
    }
  }
  const pass = maxDiff < TOL;
  allPass &&= pass;
  console.log(
    `${fam}: n=${preds.length} maxAbsDiff=${maxDiff.toExponential(3)} ${pass ? "PASS" : "FAIL"}`
  );
  if (!pass && worst) {
    console.log(`  worst: tsP=${worst.tsP} pyP=${worst.pyP}`);
    console.log(`  row=${JSON.stringify(worst.row)}`);
  }
}

if (!allPass) {
  console.log("\nPARITY FAIL — do not upload.");
  process.exit(1);
}
console.log(
  "\nPARITY PASS — TS inference + isotonic reproduce Python on real data."
);
