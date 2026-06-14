#!/usr/bin/env bun

import prisma from "@/lib/prisma";
import { loadPositionalEventBundles } from "@/lib/positional-events";
import { computePushWinner } from "@/lib/push-winner";
import { pushInputFromBundle } from "@/lib/push-winner-adapters";
import { mapNameToMapTypeMapping } from "@/types/map";
import { $Enums } from "@/generated/prisma/client";

const commit = process.argv.includes("--commit");

async function main() {
  // Push maps that don't already have a stored winner.
  const maps = await prisma.map.findMany({
    where: { winner: null },
    select: { id: true, name: true, mapData: { select: { id: true } } },
  });

  const pushMaps = maps.filter(
    (m) =>
      mapNameToMapTypeMapping[m.name as keyof typeof mapNameToMapTypeMapping] ===
      $Enums.MapType.Push
  );
  console.log(`Found ${pushMaps.length} Push maps without a stored winner.`);

  let decided = 0;
  let noData = 0;

  for (const map of pushMaps) {
    const mapDataIds = map.mapData.map((md) => md.id);
    if (mapDataIds.length === 0) {
      noData++;
      console.log(`map ${map.id} (${map.name}): no mapData — skip`);
      continue;
    }

    const bundles = await loadPositionalEventBundles(mapDataIds);
    const bundle = bundles.get(mapDataIds[0]);
    const input = bundle ? pushInputFromBundle(bundle) : null;
    const result = input ? computePushWinner(input) : null;

    if (!result) {
      noData++;
      console.log(`map ${map.id} (${map.name}): no coordinate data — leave N/A`);
      continue;
    }

    decided++;
    console.log(
      `map ${map.id} (${map.name}): winner=${result.winner} ` +
        `margin=${result.margin.toFixed(1)} confidence=${result.confidence.toFixed(2)}`
    );

    if (commit) {
      await prisma.map.update({
        where: { id: map.id },
        data: { winner: result.winner, winnerSource: "auto_coords" },
      });
    }
  }

  console.log(
    `\n${decided} decided, ${noData} left as N/A. ` +
      (commit ? "Changes committed." : "Dry run — re-run with --commit to write.")
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
