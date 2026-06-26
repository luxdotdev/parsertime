import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { datasetToCsv } from "@/lib/win-probability/training/csv";
import {
  buildRows,
  fetchEventLog,
} from "@/lib/win-probability/training/extract";
import {
  type DatasetRow,
  MODE_FAMILIES,
  type ModeFamily,
} from "@/lib/win-probability/types";
import { put } from "@vercel/blob";
import { waitUntil } from "@vercel/functions";
import { randomUUID, timingSafeEqual } from "node:crypto";

// The export (map fetch + buildRows over every map) is the long pole; training
// now runs in a separate Python function, so this route only extracts, writes
// the matrices to Blob, and fires the trainer.
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

    // Export each non-empty mode's feature matrix to Blob, then trigger the
    // Python trainer. Training (and the eventual R2 publish via the
    // wp-publish callback) happens out-of-band — this route never trains.
    const runId = randomUUID();
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    const exportedModes: ModeFamily[] = [];
    // Capture each put() result's URL so the trainer fetches the exact blob —
    // the default random suffix makes paths unguessable from runId alone.
    const urls: Partial<Record<ModeFamily, string>> = {};
    for (const family of MODE_FAMILIES) {
      const rows = rowsByFamily[family];
      if (rows.length === 0) continue;
      const blob = await put(
        `wp-train/${runId}/dataset-${family}.csv`,
        datasetToCsv(rows),
        {
          access: "public",
          contentType: "text/csv",
          token,
        }
      );
      urls[family] = blob.url;
      exportedModes.push(family);
    }
    wideEvent.run_id = runId;
    wideEvent.exported_modes = exportedModes;

    if (exportedModes.length === 0) {
      // Nothing to train on — skip the trigger and report the empty run.
      wideEvent.outcome = "no_data_exported";
      wideEvent.status_code = 200;
      return Response.json({ exported: true, runId, modes: exportedModes });
    }

    // Fire-and-trigger: kick the Python trainer but don't await its training.
    // waitUntil keeps the function alive to deliver the trigger while this
    // route returns immediately (its maxDuration is 300 and must not block on
    // training). The trainer fetches the passed blob URLs, then POSTs the
    // finished artifact back to /api/cron/wp-publish.
    const origin = "https://parsertime.app";
    waitUntil(
      fetch(`${origin}/api/wp-train`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.CRON_SECRET}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ runId, urls }),
      }).catch((error: unknown) => {
        Logger.warn({
          event: "wp.cron.retrain.trigger_failed",
          run_id: runId,
          error_message: error instanceof Error ? error.message : "unknown",
        });
      })
    );

    wideEvent.outcome = "success";
    wideEvent.status_code = 200;
    return Response.json({ exported: true, runId, modes: exportedModes });
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
