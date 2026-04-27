import { Logger } from "@/lib/logger";
import {
  discoverAllTrackedChampionships,
  ingestPlayerHistory,
} from "@/lib/tsr/ingest";
import { recomputeAllTsrs } from "@/lib/tsr/replay";
import prisma from "@/lib/prisma";
import { timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";
export const maxDuration = 300;

const REINGEST_BATCH_SIZE = 50;

type AuthResult =
  | { ok: true }
  | { ok: false; status: number; reason: "missing_secret" | "unauthorized" };

function authorizeCron(req: Request): AuthResult {
  const expected = process.env.CRON_SECRET;
  // Fail closed when the secret is unset — without this guard, a missing env
  // var collapses the comparison string to "Bearer undefined" and any caller
  // sending that literal would pass.
  if (!expected) {
    return { ok: false, status: 500, reason: "missing_secret" };
  }
  const header = req.headers.get("Authorization");
  const provided = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!provided || provided.length !== expected.length) {
    return { ok: false, status: 401, reason: "unauthorized" };
  }
  try {
    const ok = timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
    if (!ok) return { ok: false, status: 401, reason: "unauthorized" };
  } catch {
    return { ok: false, status: 401, reason: "unauthorized" };
  }
  return { ok: true };
}

export async function GET(req: Request): Promise<Response> {
  const startTime = Date.now();
  const wideEvent: Record<string, unknown> = {
    event: "tsr.cron.recompute",
    method: "GET",
    path: "/api/cron/tsr-recompute",
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

    const discovery = await discoverAllTrackedChampionships();
    wideEvent.discovery = {
      organizers: discovery.length,
      inserted: discovery.reduce((s, d) => s + d.inserted, 0),
      updated: discovery.reduce((s, d) => s + d.updated, 0),
      unclassified: discovery.reduce((s, d) => s + d.unclassified, 0),
    };

    const stalePlayers = await prisma.faceitPlayer.findMany({
      where: { rosterEntries: { some: {} } },
      orderBy: { lastSyncedAt: "asc" },
      take: REINGEST_BATCH_SIZE,
      select: { faceitPlayerId: true },
    });
    let reingestIngested = 0;
    let reingestSkipped = 0;
    let reingestFailures = 0;
    for (const p of stalePlayers) {
      try {
        const r = await ingestPlayerHistory(p.faceitPlayerId, { maxPages: 5 });
        reingestIngested += r.ingested;
        reingestSkipped += r.skipped;
        await prisma.faceitPlayer.update({
          where: { faceitPlayerId: p.faceitPlayerId },
          data: { lastSyncedAt: new Date() },
        });
      } catch (err) {
        reingestFailures += 1;
        Logger.warn({
          event: "tsr.cron.reingest_failed",
          faceit_player_id: p.faceitPlayerId,
          error_message: err instanceof Error ? err.message : "unknown",
        });
      }
    }
    wideEvent.reingest = {
      players_attempted: stalePlayers.length,
      matches_ingested: reingestIngested,
      matches_skipped: reingestSkipped,
      failures: reingestFailures,
    };

    const replay = await recomputeAllTsrs();
    wideEvent.replay = {
      matches_replayed: replay.matchesReplayed,
      players_updated: replay.playersUpdated,
      stale_rows_dropped: replay.staleRowsDropped,
      duration_ms: replay.durationMs,
    };

    wideEvent.status_code = 200;
    wideEvent.outcome = "success";

    return Response.json({
      ok: true,
      discovery: wideEvent.discovery,
      reingest: wideEvent.reingest,
      replay: wideEvent.replay,
    });
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
