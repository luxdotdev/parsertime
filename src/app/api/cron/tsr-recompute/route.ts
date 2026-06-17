import { Logger } from "@/lib/logger";
import { recomputeAllTeamTsrSnapshots } from "@/lib/matchmaker/snapshot";
import { recomputeAllTsrs } from "@/lib/tsr/replay";
import { timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";
export const maxDuration = 300;

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

// This cron does ONLY the fast, network-free recalculation: replay every
// already-ingested match into player ratings, then rebuild team snapshots.
// Both run off the local DB and finish in seconds, so this stays well inside
// the function budget and is safe to run frequently. The network-bound work
// (championship discovery + stale-player history re-ingest) lives in the
// separate /api/cron/tsr-enrich cron so a slow FACEIT API can never starve
// the rating recalculation.
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

    const replay = await recomputeAllTsrs();
    wideEvent.replay = {
      matches_replayed: replay.matchesReplayed,
      players_updated: replay.playersUpdated,
      stale_rows_dropped: replay.staleRowsDropped,
      duration_ms: replay.durationMs,
    };

    const snapshotResult = await recomputeAllTeamTsrSnapshots();
    wideEvent.team_snapshots = snapshotResult;

    wideEvent.status_code = 200;
    wideEvent.outcome = "success";

    return Response.json({
      ok: true,
      replay: wideEvent.replay,
      team_snapshots: wideEvent.team_snapshots,
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
