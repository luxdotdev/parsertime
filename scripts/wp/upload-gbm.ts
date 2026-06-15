#!/usr/bin/env bun
// One-off: publish the locally-built, parity-validated GBM artifact to R2.
import { readFileSync } from "node:fs";
import { publishArtifact } from "@/lib/win-probability/artifact-store";
import { featureHash } from "@/lib/win-probability/features";
import type { ModelArtifact } from "@/lib/win-probability/model";

const art = JSON.parse(
  readFileSync("artifacts/wp/model-gbm.json", "utf8")
) as ModelArtifact;

if (art.featureHash !== featureHash()) {
  throw new Error(`hash ${art.featureHash} != code ${featureHash()}`);
}
art.createdAt = new Date().toISOString();

const published = await publishArtifact(art);
console.log(
  `published ${published.key} (model version ${published.modelVersion})`
);

for (const [fam, m] of Object.entries(art.modeFamilies)) {
  if (m === null) {
    console.log(`  ${fam}: null`);
    continue;
  }
  const kind = "trees" in m ? "gbm" : "lr";
  console.log(
    `  ${fam}: ${kind} logLoss=${m.metrics?.logLoss?.toFixed(4) ?? "?"}`
  );
}
