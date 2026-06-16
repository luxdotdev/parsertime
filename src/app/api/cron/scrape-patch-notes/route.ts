import { upsertScrapedPatches } from "@/data/overwatch/patches-service";
import { Logger } from "@/lib/logger";
import { scrapeRecent } from "@/lib/overwatch/patch-scraper";
import { timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";
export const maxDuration = 60;

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
    event: "overwatch.cron.scrape_patches",
    method: "GET",
    path: "/api/cron/scrape-patch-notes",
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

    const scraped = await scrapeRecent();
    wideEvent.scraped_count = scraped.length;

    const result = await upsertScrapedPatches(scraped);
    wideEvent.inserted = result.inserted;
    wideEvent.updated = result.updated;
    wideEvent.skipped = result.skipped;

    wideEvent.status_code = 200;
    wideEvent.outcome = "success";

    return Response.json({ ok: true, ...result, scraped: scraped.length });
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
