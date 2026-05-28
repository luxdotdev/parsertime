import {
  cronDeletedItemsCounter,
  cronJobCounter,
  cronJobDuration,
} from "@/lib/axiom/metrics";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import type { NextRequest } from "next/server";

function isCronAuthorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  return (
    Boolean(secret) && req.headers.get("Authorization") === `Bearer ${secret}`
  );
}

export async function DELETE(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const start = performance.now();
  cronJobCounter.add(1, { job: "delete-empty-scrims" });

  const scrimsWithoutMaps = await prisma.scrim.findMany({
    where: {
      maps: { none: {} },
      // Skip synthetic scrims created for tournament matches
      tournamentMatch: null,
    },
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
    await prisma.scrim.deleteMany({
      where: {
        id: scrim.id,
        maps: { none: {} },
        tournamentMatch: null,
      },
    });
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
export async function GET(req: NextRequest) {
  return await DELETE(req);
}
