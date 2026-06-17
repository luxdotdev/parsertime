#!/usr/bin/env bun

import prisma from "@/lib/prisma";
import { classifyZonesForCalibration } from "@/lib/zones/classify";

async function main() {
  const calibrations = await prisma.mapCalibration.findMany({
    select: { id: true, mapName: true },
    orderBy: { mapName: "asc" },
  });
  console.log(`Found ${calibrations.length} calibrations`);

  let proposed = 0;
  let skipped = 0;
  let failed = 0;

  for (const { id, mapName } of calibrations) {
    try {
      const result = await classifyZonesForCalibration(id, "zone-seed-script");
      if (result.ok) {
        proposed++;
        console.log(
          `${mapName}: ${result.pointZones} point(s), ${result.laneZones} lane(s)`
        );
      } else {
        skipped++;
        console.log(`${mapName}: skipped (${result.reason})`);
      }
    } catch (error) {
      failed++;
      console.error(`${mapName}: FAILED`, error);
    }
  }

  console.log(
    `\nDone. ${proposed} proposed, ${skipped} skipped, ${failed} failed.`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
