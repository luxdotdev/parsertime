import { Logger } from "@/lib/logger";
import { publishArtifact } from "@/lib/win-probability/artifact-store";
import { featureHash } from "@/lib/win-probability/features";
import type { ModelArtifact } from "@/lib/win-probability/model";
import { timingSafeEqual } from "node:crypto";

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

/**
 * Publish-callback for the Python trainer: it POSTs the finished artifact JSON
 * here, and this route single-sources the R2 publish in TS. The Python
 * function never touches R2 directly.
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

    const art = (await req.json()) as ModelArtifact;

    // Refuse an artifact trained against a different feature set — the code's
    // feature order is the contract, and a mismatch would mis-index features.
    if (art.featureHash !== featureHash()) {
      wideEvent.outcome = "feature_hash_mismatch";
      wideEvent.status_code = 400;
      wideEvent.artifact_hash = art.featureHash;
      wideEvent.code_hash = featureHash();
      return new Response("Feature hash mismatch", { status: 400 });
    }

    art.createdAt = new Date().toISOString();
    const published = await publishArtifact(art);
    wideEvent.published_key = published.key;
    wideEvent.model_version = published.modelVersion;
    wideEvent.outcome = "success";
    wideEvent.status_code = 200;
    return Response.json({
      key: published.key,
      modelVersion: published.modelVersion,
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
