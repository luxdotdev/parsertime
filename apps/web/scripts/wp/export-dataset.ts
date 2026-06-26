#!/usr/bin/env bun

import prisma from "@/lib/prisma";
import { datasetToCsv } from "@/lib/win-probability/training/csv";
import {
  buildRows,
  fetchEventLog,
} from "@/lib/win-probability/training/extract";
import { MODE_FAMILIES } from "@/lib/win-probability/types";
import * as fs from "node:fs";
import * as path from "node:path";

const OUT_DIR = "artifacts/wp";
const BATCH_SIZE = 50;

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  // Header-only serialization gives the canonical first line; row bodies are
  // appended below via the same helper so output stays byte-identical.
  const header = datasetToCsv([]);
  const streams = new Map(
    MODE_FAMILIES.map((family) => {
      const stream = fs.createWriteStream(
        path.join(OUT_DIR, `dataset-${family}.csv`)
      );
      stream.write(header);
      return [family, stream] as const;
    })
  );

  const maps = await prisma.matchStart.findMany({
    where: { map_type: { not: "Clash" }, MapDataId: { not: null } },
    select: { MapDataId: true },
    distinct: ["MapDataId"],
  });
  console.log(`Exporting ${maps.length} maps…`);

  let written = 0;
  let skipped = 0;
  for (let i = 0; i < maps.length; i += BATCH_SIZE) {
    const batch = maps.slice(i, i + BATCH_SIZE);
    const logs = await Promise.all(
      batch.map((m) => fetchEventLog(m.MapDataId as number))
    );
    for (let j = 0; j < batch.length; j++) {
      const log = logs[j];
      if (log === null) {
        skipped++;
        continue;
      }
      const rows = buildRows(log, batch[j].MapDataId as number);
      if (rows.length === 0) {
        skipped++; // tie-labeled or empty map — counted, never silent
        continue;
      }
      const stream = streams.get(log.modeFamily);
      if (stream === undefined) continue;
      // Drop the helper's header line; only the row body is appended here.
      stream.write(datasetToCsv(rows).slice(header.length));
      written++;
    }
    console.log(`  ${Math.min(i + BATCH_SIZE, maps.length)}/${maps.length}`);
  }

  for (const stream of streams.values()) stream.end();
  console.log(`Done. Maps exported: ${written}, skipped: ${skipped}.`);
  await prisma.$disconnect();
}

await main();
