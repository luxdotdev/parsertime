import {
  cronDeletedItemsCounter,
  cronJobCounter,
  cronJobDuration,
} from "@/lib/axiom/metrics";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export async function DELETE() {
  const start = performance.now();
  cronJobCounter.add(1, { job: "delete-empty-scrims" });

  const scrimsWithoutMaps = await prisma.scrim.findMany({
    where: { maps: { none: {} } },
    select: { id: true },
  });

  if (scrimsWithoutMaps.length === 0) {
    Logger.info("No empty scrims found");
  } else {
    Logger.info(
      `Found the following empty scrims: ${scrimsWithoutMaps
        .map((scrim) => scrim.id)
        .join(", ")}`
    );
  }

  for (const scrim of scrimsWithoutMaps) {
    Logger.info(`Deleting scrim ${scrim.id}`);
    await prisma.scrim.delete({ where: { id: scrim.id } });
  }

  cronDeletedItemsCounter.add(scrimsWithoutMaps.length, {
    job: "delete-empty-scrims",
  });
  cronJobDuration.record(performance.now() - start, {
    job: "delete-empty-scrims",
  });

  return new Response("OK", { status: 200 });
}

// This is necessary for using Vercel Cron Jobs
export async function GET() {
  return await DELETE();
}
