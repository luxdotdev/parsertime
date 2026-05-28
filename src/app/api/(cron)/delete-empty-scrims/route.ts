import {
  cronDeletedItemsCounter,
  cronJobCounter,
  cronJobDuration,
} from "@/lib/axiom/metrics";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

type CronAuthResult =
  | { ok: true }
  | { ok: false; status: number; body: string };

function authorizeCron(req: NextRequest): CronAuthResult {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return { ok: false, status: 500, body: "Server misconfigured" };
  }

  const header = req.headers.get("Authorization");
  const provided = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!provided || provided.length !== secret.length) {
    return { ok: false, status: 401, body: "Unauthorized" };
  }

  try {
    if (timingSafeEqual(Buffer.from(provided), Buffer.from(secret))) {
      return { ok: true };
    }
  } catch {
    // Fall through to the unauthorized response.
  }

  return { ok: false, status: 401, body: "Unauthorized" };
}

export async function DELETE(req: NextRequest) {
  const auth = authorizeCron(req);
  if (!auth.ok) {
    return new Response(auth.body, { status: auth.status });
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
