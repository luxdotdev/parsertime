import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import {
  aggregateActiveUsers,
  aggregateFeatureRollups,
  aggregatePageRollups,
  dayKey,
} from "@/lib/usage/rollup";
import { timingSafeEqual } from "node:crypto";

export const maxDuration = 300;

type AuthResult =
  | { ok: true }
  | { ok: false; status: number; reason: "missing_secret" | "unauthorized" };

function authorizeCron(req: Request): AuthResult {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return { ok: false, status: 500, reason: "missing_secret" };
  }
  const header = req.headers.get("Authorization");
  const provided = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!provided || provided.length !== expected.length) {
    return { ok: false, status: 401, reason: "unauthorized" };
  }
  try {
    if (!timingSafeEqual(Buffer.from(provided), Buffer.from(expected))) {
      return { ok: false, status: 401, reason: "unauthorized" };
    }
  } catch {
    return { ok: false, status: 401, reason: "unauthorized" };
  }
  return { ok: true };
}

/** Aggregate a single UTC day and upsert its rollups (idempotent). */
async function rollupDay(day: string): Promise<number> {
  const start = new Date(`${day}T00:00:00.000Z`);
  const end = new Date(`${day}T00:00:00.000Z`);
  end.setUTCDate(end.getUTCDate() + 1);

  const rows = await prisma.usageEvent.findMany({
    where: { ts: { gte: start, lt: end } },
    select: {
      name: true,
      environment: true,
      userId: true,
      teamId: true,
      path: true,
    },
  });

  const features = aggregateFeatureRollups(rows, day);
  const pages = aggregatePageRollups(rows, day);
  const actives = aggregateActiveUsers(rows, day);

  await prisma.$transaction([
    ...features.map((f) =>
      prisma.dailyFeatureRollup.upsert({
        where: {
          environment_day_name: {
            environment: f.environment,
            day: f.day,
            name: f.name,
          },
        },
        create: f,
        update: {
          totalEvents: f.totalEvents,
          uniqueUsers: f.uniqueUsers,
          uniqueTeams: f.uniqueTeams,
        },
      })
    ),
    ...pages.map((p) =>
      prisma.dailyPageRollup.upsert({
        where: {
          environment_day_path: {
            environment: p.environment,
            day: p.day,
            path: p.path,
          },
        },
        create: p,
        update: { views: p.views, uniqueUsers: p.uniqueUsers },
      })
    ),
    ...actives.map((a) =>
      prisma.userActiveDay.upsert({
        where: {
          environment_day_userId: {
            environment: a.environment,
            day: a.day,
            userId: a.userId,
          },
        },
        create: a,
        update: {},
      })
    ),
  ]);

  return rows.length;
}

export async function GET(req: Request): Promise<Response> {
  const startTime = Date.now();
  const wideEvent: Record<string, unknown> = {
    event: "usage.cron.rollup",
    method: "GET",
    path: "/api/cron/usage-rollup",
    timestamp: new Date().toISOString(),
  };

  try {
    const auth = authorizeCron(req);
    if (!auth.ok) {
      wideEvent.outcome = "denied";
      wideEvent.auth_reason = auth.reason;
      wideEvent.status_code = auth.status;
      const body =
        auth.reason === "missing_secret"
          ? "Server misconfigured"
          : "Unauthorized";
      return new Response(body, { status: auth.status });
    }
    wideEvent.auth_reason = "ok";

    // Roll up yesterday, and self-heal up to 7 prior days with missing rollups.
    const today = new Date();
    const processed: Record<string, number> = {};
    for (let back = 1; back <= 7; back++) {
      const d = new Date(today);
      d.setUTCDate(d.getUTCDate() - back);
      const day = dayKey(d);
      const existing = await prisma.dailyFeatureRollup.count({
        where: { day },
      });
      if (back === 1 || existing === 0) {
        processed[day] = await rollupDay(day);
      }
    }

    wideEvent.processed = processed;
    wideEvent.status_code = 200;
    wideEvent.outcome = "success";

    return Response.json({ ok: true, processed });
  } catch (error) {
    wideEvent.status_code = 500;
    wideEvent.outcome = "error";
    wideEvent.error = {
      message: error instanceof Error ? error.message : "Unknown error",
      type: error instanceof Error ? error.name : "Error",
    };
    throw error;
  } finally {
    wideEvent.duration_ms = Date.now() - startTime;
    Logger.info(wideEvent);
  }
}
