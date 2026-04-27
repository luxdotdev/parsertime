import { Logger } from "@/lib/logger";
import { ingestMatchById } from "@/lib/tsr/ingest";
import { recomputeAllTsrs } from "@/lib/tsr/replay";
import { createHmac, timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";

type FaceitWebhookEvent = {
  transaction_id?: string;
  event?: string;
  event_id?: string;
  timestamp?: number;
  retry_count?: number;
  version?: number;
  payload?: {
    id?: string;
    organizer_id?: string;
    region?: string;
  };
};

const HANDLED_EVENTS = new Set([
  "match_status_finished",
  "match_status_cancelled",
  "match_status_aborted",
]);

function verifySignature(rawBody: string, header: string | null): boolean {
  const secret = process.env.FACEIT_WEBHOOK_SECRET;
  if (!secret) {
    // No secret configured — refuse rather than process unauthenticated input.
    return false;
  }
  if (!header) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  // FACEIT delivers the signature as `sha256=<hex>` per their webhook docs.
  const provided = header.startsWith("sha256=") ? header.slice(7) : header;
  if (provided.length !== expected.length) return false;
  try {
    return timingSafeEqual(
      Buffer.from(provided, "hex"),
      Buffer.from(expected, "hex")
    );
  } catch {
    return false;
  }
}

export async function POST(req: Request): Promise<Response> {
  const startTime = Date.now();
  const wideEvent: Record<string, unknown> = {
    event: "tsr.faceit.webhook",
    method: "POST",
    path: "/api/faceit/webhook",
    timestamp: new Date().toISOString(),
  };

  try {
    const rawBody = await req.text();
    const sig =
      req.headers.get("x-faceit-signature-256") ??
      req.headers.get("x-faceit-signature");

    if (!verifySignature(rawBody, sig)) {
      wideEvent.outcome = "denied";
      wideEvent.signature_valid = false;
      wideEvent.status_code = 401;
      return new Response("Unauthorized", { status: 401 });
    }
    wideEvent.signature_valid = true;

    let event: FaceitWebhookEvent;
    try {
      event = JSON.parse(rawBody) as FaceitWebhookEvent;
    } catch (err) {
      wideEvent.outcome = "bad_request";
      wideEvent.status_code = 400;
      wideEvent.parse_error = err instanceof Error ? err.message : "unknown";
      return new Response("Bad Request", { status: 400 });
    }

    const eventName = event.event ?? "";
    wideEvent.faceit_event = eventName;
    wideEvent.faceit_event_id = event.event_id;
    wideEvent.faceit_transaction_id = event.transaction_id;
    wideEvent.retry_count = event.retry_count;

    if (!HANDLED_EVENTS.has(eventName)) {
      wideEvent.outcome = "ignored";
      wideEvent.status_code = 200;
      return Response.json({ ok: true, ignored: true, event: eventName });
    }

    const matchId = event.payload?.id;
    wideEvent.match_id = matchId;
    wideEvent.organizer_id = event.payload?.organizer_id;
    wideEvent.region = event.payload?.region;

    if (!matchId) {
      wideEvent.outcome = "bad_request";
      wideEvent.status_code = 400;
      wideEvent.parse_error = "missing_payload_id";
      return new Response("Bad Request", { status: 400 });
    }

    const result = await ingestMatchById(matchId);
    wideEvent.ingested = result.ingested;
    wideEvent.ingest_reason = result.reason;
    wideEvent.affected_player_count = result.affectedPlayerIds.length;

    if (result.ingested) {
      // Recompute is region-agnostic and cheap; fire and forget so the
      // webhook ack stays fast. The recompute emits its own wide event.
      recomputeAllTsrs().catch((err) => {
        Logger.error({
          event: "tsr.faceit.webhook.recompute_failed",
          match_id: matchId,
          error_message: err instanceof Error ? err.message : "unknown",
        });
      });
    }

    wideEvent.outcome = "success";
    wideEvent.status_code = 200;
    return Response.json({
      ok: true,
      matchId,
      ingested: result.ingested,
      reason: result.reason,
    });
  } catch (error) {
    wideEvent.outcome = "error";
    wideEvent.status_code = 500;
    wideEvent.error = {
      message: error instanceof Error ? error.message : "Unknown error",
      type: error instanceof Error ? error.name : "Error",
    };
    return new Response("Internal Server Error", { status: 500 });
  } finally {
    wideEvent.duration_ms = Date.now() - startTime;
    Logger.info(wideEvent);
  }
}
