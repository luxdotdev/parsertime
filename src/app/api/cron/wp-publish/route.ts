import { Logger } from "@/lib/logger";
import {
  loadLatestArtifact,
  publishArtifact,
} from "@/lib/win-probability/artifact-store";
import { featureHash } from "@/lib/win-probability/features";
import type { FamilyModel, ModelArtifact } from "@/lib/win-probability/model";
import { chooseFamily } from "@/lib/win-probability/training/champion-challenger";
import { MODE_FAMILIES, type ModeFamily } from "@/lib/win-probability/types";
import { timingSafeEqual } from "node:crypto";
import { gunzipSync } from "node:zlib";

export const runtime = "nodejs";
export const maxDuration = 60;

type AuthResult =
  | { ok: true }
  | { ok: false; status: number; reason: "missing_secret" | "unauthorized" };

function authorizeCron(req: Request): AuthResult {
  const expected = process.env.CRON_SECRET;
  // Fail closed when the secret is unset — see wp-retrain for the rationale.
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

/** The gzipped candidate the Python trainer POSTs: per-mode trained families
 * plus per-mode gate flags. The incumbent never travels the wire — this route
 * loads it from R2 and runs champion/challenger here. */
type CandidatePayload = {
  schemaVersion: 1;
  featureHash: string;
  modeFamilies: Record<ModeFamily, FamilyModel | null>;
  gates: Partial<Record<ModeFamily, boolean>>;
};

/** Read the raw body and decode it as the candidate payload. The trainer sends
 * gzip (Content-Encoding: gzip); a plain-JSON body (manual curl) still parses. */
async function readCandidate(req: Request): Promise<CandidatePayload> {
  const raw = Buffer.from(await req.arrayBuffer());
  const encoding = req.headers.get("Content-Encoding")?.toLowerCase() ?? "";
  const json = encoding.includes("gzip")
    ? gunzipSync(raw).toString("utf8")
    : raw.toString("utf8");
  return JSON.parse(json) as CandidatePayload;
}

/**
 * Publish-callback for the Python trainer: it POSTs a gzipped candidate
 * (per-mode trained families + gate flags) here. This route loads the live
 * incumbent from R2, runs the per-mode champion/challenger decision, and
 * single-sources the R2 publish in TS. The Python function never touches R2.
 */
export async function POST(req: Request): Promise<Response> {
  const startTime = Date.now();
  const wideEvent: Record<string, unknown> = {
    event: "wp.cron.publish",
    method: "POST",
    path: "/api/cron/wp-publish",
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

    const candidate = await readCandidate(req);

    // Refuse a candidate trained against a different feature set — the code's
    // feature order is the contract, and a mismatch would mis-index features.
    if (candidate.featureHash !== featureHash()) {
      wideEvent.outcome = "feature_hash_mismatch";
      wideEvent.status_code = 400;
      wideEvent.artifact_hash = candidate.featureHash;
      wideEvent.code_hash = featureHash();
      return new Response("Feature hash mismatch", { status: 400 });
    }

    // Champion/challenger decided here against the live R2 incumbent.
    const live = await loadLatestArtifact();
    const chosen: Record<ModeFamily, FamilyModel | null> = {
      control: null,
      escort_hybrid: null,
      push: null,
      flashpoint: null,
    };
    for (const mode of MODE_FAMILIES) {
      chosen[mode] = chooseFamily(
        candidate.modeFamilies[mode] ?? null,
        candidate.gates[mode] ?? false,
        live?.modeFamilies[mode] ?? null
      );
    }

    const artifact: ModelArtifact = {
      schemaVersion: 1,
      modelVersion: 0, // the publish step reassigns the real version
      createdAt: new Date().toISOString(),
      featureHash: candidate.featureHash,
      modeFamilies: chosen,
    };

    const published = await publishArtifact(artifact);
    wideEvent.published_key = published.key;
    wideEvent.model_version = published.modelVersion;
    wideEvent.outcome = "success";
    wideEvent.status_code = 200;
    const shipped = Object.fromEntries(
      MODE_FAMILIES.map((mode) => [mode, chosen[mode]?.kind ?? null])
    );
    wideEvent.shipped = shipped;
    return Response.json({
      key: published.key,
      modelVersion: published.modelVersion,
      shipped,
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
