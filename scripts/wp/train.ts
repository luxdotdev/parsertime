#!/usr/bin/env bun

import { FEATURE_NAMES } from "@/lib/win-probability/features";
import { buildArtifact } from "@/lib/win-probability/training/train-core";
import {
  type DatasetRow,
  MODE_FAMILIES,
  type ModeFamily,
} from "@/lib/win-probability/types";
import * as fs from "node:fs";
import * as path from "node:path";

const OUT_DIR = "artifacts/wp";

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

async function main() {
  const rowsByFamily = Object.fromEntries(
    MODE_FAMILIES.map((f) => [f, readCsv(f)])
  ) as Record<ModeFamily, DatasetRow[]>;

  const { artifact, reports, trainedFamilies } = buildArtifact(rowsByFamily, 1);
  for (const family of MODE_FAMILIES) {
    console.log(`\n=== ${family} ===`);
    for (const line of reports[family]) console.log(`  ${line}`);
    const model = artifact.modeFamilies[family];
    if (model !== null) {
      console.log("  weights:");
      FEATURE_NAMES.forEach((name, i) => {
        console.log(`    ${name}: ${model.weights[i].toFixed(4)}`);
      });
    }
  }

  if (trainedFamilies.length === 0) {
    console.error("\nNo family passed gates — refusing to write an artifact.");
    process.exit(1);
  }

  const out = path.join(OUT_DIR, "model-v1.json");
  fs.writeFileSync(out, JSON.stringify(artifact, null, 2));
  console.log(`\nWrote ${out} (families: ${trainedFamilies.join(", ")})`);

  if (process.argv.includes("--upload")) {
    const { publishArtifact } = await import(
      "@/lib/win-probability/artifact-store"
    );
    const published = await publishArtifact(artifact);
    console.log(
      `Published ${published.key} (model version ${published.modelVersion})`
    );
  }
}

await main();
