import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { BroadcastService } from "@/data/tournament";
import { auth, canViewTournament, getCurrentUser } from "@/lib/auth";
import { Logger } from "@/lib/logger";
import { Ratelimit } from "@upstash/ratelimit";
import { ipAddress } from "@vercel/functions";
import { kv } from "@vercel/kv";
import type { NextRequest } from "next/server";

const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(30, "1 m"),
  analytics: true,
  prefix: "ratelimit:broadcast",
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  const startTime = Date.now();
  const event: Record<string, unknown> = {
    route: "broadcast.tournament",
    method: "GET",
  };

  try {
    const session = await auth();
    if (!session?.user?.email) {
      event.outcome = "unauthorized";
      event.statusCode = 401;
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const identifier = ipAddress(request) ?? "127.0.0.1";
    const { success } = await ratelimit.limit(identifier);

    if (!success) {
      event.outcome = "rate_limited";
      event.statusCode = 429;
      return Response.json(
        { error: "Rate limit exceeded. Try again shortly." },
        { status: 429 }
      );
    }

    const { tournamentId: tournamentIdParam } = await params;
    const tournamentId = parseInt(tournamentIdParam, 10);

    if (isNaN(tournamentId)) {
      event.outcome = "bad_request";
      event.statusCode = 400;
      return Response.json({ error: "Invalid tournament ID" }, { status: 400 });
    }
    event.tournamentId = tournamentId;

    const user = await getCurrentUser();
    if (!(await canViewTournament(tournamentId, user))) {
      event.outcome = "forbidden";
      event.statusCode = 403;
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const data = await AppRuntime.runPromise(
      BroadcastService.pipe(
        Effect.flatMap((svc) => svc.getTournamentBroadcastData(tournamentId))
      )
    );

    if (!data) {
      event.outcome = "not_found";
      event.statusCode = 404;
      return Response.json({ error: "Tournament not found" }, { status: 404 });
    }

    event.outcome = "success";
    event.statusCode = 200;
    event.playerCount = data.players.length;
    return Response.json(data, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    event.outcome = "error";
    event.statusCode = 500;
    event.error = error instanceof Error ? error.message : String(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  } finally {
    event.durationMs = Date.now() - startTime;
    if (event.outcome === "error") {
      Logger.error(event);
    } else {
      Logger.info(event);
    }
  }
}
