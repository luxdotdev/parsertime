import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { auth } from "@/lib/auth";
import { Logger } from "@/lib/logger";
import { normalizePath } from "@/lib/usage/normalize";
import { usage } from "@/lib/usage/server";
import { Ratelimit } from "@upstash/ratelimit";
import { ipAddress } from "@vercel/functions";
import { kv } from "@vercel/kv";
import type { NextRequest } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(120, "1 m"),
  analytics: true,
  prefix: "ratelimit:usage-ingest",
});

const IngestSchema = z.object({
  name: z.string().min(1).max(120),
  path: z.string().max(2048).optional(),
  sessionId: z.string().max(128).optional(),
  teamId: z.number().int().optional(),
  props: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  const identifier = ipAddress(req) ?? "127.0.0.1";
  const { success } = await ratelimit.limit(identifier);
  if (!success) {
    return new Response("Rate limit exceeded", { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const parsed = IngestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response("Bad request", { status: 400 });
  }

  // Resolve the user from the session (do not trust a client-supplied userId).
  const session = await auth();
  let userId: string | null = null;
  if (session?.user?.email) {
    const user = await AppRuntime.runPromise(
      UserService.pipe(
        Effect.flatMap((svc) => svc.getUser(session.user.email))
      )
    ).catch(() => null);
    userId = user?.id ?? null;
  }

  // environment is stamped server-side inside usage.track via resolveUsageEnv.
  void usage.track({
    name: parsed.data.name,
    source: "CLIENT",
    userId,
    teamId: parsed.data.teamId ?? null,
    path: parsed.data.path ? normalizePath(parsed.data.path) : null,
    sessionId: parsed.data.sessionId ?? null,
    props: parsed.data.props ?? null,
  });

  Logger.info("usage.ingest", { name: parsed.data.name });
  return new Response(null, { status: 204 });
}
