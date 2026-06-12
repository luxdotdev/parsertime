import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { publishArtifact } from "@/lib/win-probability/artifact-store";
import {
  buildRows,
  fetchEventLog,
} from "@/lib/win-probability/training/extract";
import { buildArtifact } from "@/lib/win-probability/training/train-core";
import {
  type DatasetRow,
  MODE_FAMILIES,
  type ModeFamily,
} from "@/lib/win-probability/types";
import { timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";
export const maxDuration = 300;

const BATCH_SIZE = 50;

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
    event: "wp.cron.retrain",
    method: "GET",
    path: "/api/cron/wp-retrain",
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

    const maps = await prisma.matchStart.findMany({
      where: { map_type: { not: "Clash" }, MapDataId: { not: null } },
      select: { MapDataId: true },
      distinct: ["MapDataId"],
    });
    wideEvent.maps_total = maps.length;

    const rowsByFamily: Record<ModeFamily, DatasetRow[]> = {
      control: [],
      escort_hybrid: [],
      push: [],
      flashpoint: [],
    };
    let mapsExported = 0;
    let mapsSkipped = 0;

    for (let i = 0; i < maps.length; i += BATCH_SIZE) {
      const batch = maps.slice(i, i + BATCH_SIZE);
      const logs = await Promise.all(
        batch.map((m) => fetchEventLog(m.MapDataId!))
      );
      for (let j = 0; j < batch.length; j++) {
        const log = logs[j];
        if (log === null) {
          mapsSkipped++;
          continue;
        }
        const rows = buildRows(log, batch[j].MapDataId!);
        if (rows.length === 0) {
          mapsSkipped++;
          continue;
        }
        rowsByFamily[log.modeFamily].push(...rows);
        mapsExported++;
      }
    }
    wideEvent.maps_exported = mapsExported;
    wideEvent.maps_skipped = mapsSkipped;
    wideEvent.rows_by_family = Object.fromEntries(
      MODE_FAMILIES.map((f) => [f, rowsByFamily[f].length])
    );

    const { artifact, reports, trainedFamilies } = buildArtifact(
      rowsByFamily,
      0 // placeholder — publishArtifact assigns the real version
    );
    wideEvent.trained_families = trainedFamilies;
    for (const family of MODE_FAMILIES) {
      const gateFailures = reports[family].filter((line) =>
        line.startsWith("GATE FAIL")
      );
      if (gateFailures.length > 0) {
        Logger.warn({
          event: "wp.cron.retrain.gate_failed",
          family,
          failures: gateFailures,
        });
      }
    }

    if (trainedFamilies.length === 0) {
      // Gates held the line: a valid run that declined to deploy. The old
      // pointer keeps serving; the warn logs above are the alert signal.
      wideEvent.outcome = "no_family_passed";
      wideEvent.status_code = 200;
      return Response.json({ published: false, trainedFamilies: [] });
    }

    const published = await publishArtifact(artifact);
    wideEvent.published_key = published.key;
    wideEvent.model_version = published.modelVersion;
    wideEvent.outcome = "success";
    wideEvent.status_code = 200;
    return Response.json({
      published: true,
      key: published.key,
      modelVersion: published.modelVersion,
      trainedFamilies,
    });
  } catch (error) {
    wideEvent.outcome = "error";
    wideEvent.status_code = 500;
    wideEvent.error_message =
      error instanceof Error ? error.message : "unknown";
    return new Response("Internal error", { status: 500 });
  } finally {
    wideEvent.duration_ms = Date.now() - startTime;
    if (wideEvent.outcome === "error") {
      Logger.error(wideEvent);
    } else {
      Logger.info(wideEvent);
    }
  }
}
