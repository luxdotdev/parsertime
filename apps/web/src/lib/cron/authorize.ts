import { timingSafeEqual } from "node:crypto";

export type CronAuthResult =
  | { ok: true }
  | { ok: false; status: number; reason: "missing_secret" | "unauthorized" };

/** Authenticate a Vercel Cron request with the shared CRON_SECRET. */
export function authorizeCron(req: Request): CronAuthResult {
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

export function cronAuthFailureResponse(
  auth: Exclude<CronAuthResult, { ok: true }>
): Response {
  return new Response(
    auth.reason === "missing_secret" ? "Server misconfigured" : "Unauthorized",
    { status: auth.status }
  );
}
