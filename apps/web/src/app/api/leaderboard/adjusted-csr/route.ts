import {
  getAdjustedCSRLeaderboard,
  type AdjustedCSRLeaderboardParams,
} from "@/lib/adjusted-csr";
import { Logger } from "@/lib/logger";
import { type HeroName, heroRoleMapping } from "@/types/heroes";

export const runtime = "nodejs";

function parseInt32(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function resolveHero(value: string | null): HeroName | null {
  if (!value) return null;
  const heroLower = value.toLowerCase();
  return (
    (Object.keys(heroRoleMapping) as HeroName[]).find(
      (hero) => hero.toLowerCase() === heroLower
    ) ?? null
  );
}

export async function GET(req: Request): Promise<Response> {
  const startTime = Date.now();
  const url = new URL(req.url);
  const wideEvent: Record<string, unknown> = {
    event: "adjusted_csr.leaderboard.query",
    method: "GET",
    path: "/api/leaderboard/adjusted-csr",
    timestamp: new Date().toISOString(),
  };

  try {
    const hero = resolveHero(url.searchParams.get("hero"));
    if (!hero) {
      wideEvent.outcome = "bad_request";
      wideEvent.status_code = 400;
      return Response.json(
        { success: false, error: "Valid hero query parameter is required" },
        { status: 400 }
      );
    }

    const playerParam = url.searchParams.get("player")?.trim();
    const player =
      playerParam !== undefined && playerParam.length > 0
        ? playerParam
        : undefined;
    const query: AdjustedCSRLeaderboardParams = {
      hero,
      player,
      limit: parseInt32(url.searchParams.get("limit"), 50),
      minMaps: parseInt32(url.searchParams.get("minMaps"), 10),
      minTimeSeconds: parseInt32(url.searchParams.get("minTimeSeconds"), 60),
    };

    wideEvent.hero = query.hero;
    wideEvent.has_player = !!query.player;
    wideEvent.limit = query.limit;
    wideEvent.min_maps = query.minMaps;
    wideEvent.min_time_seconds = query.minTimeSeconds;

    const data = await getAdjustedCSRLeaderboard(query);
    const rowCount = Array.isArray(data) ? data.length : data ? 1 : 0;
    wideEvent.outcome = "success";
    wideEvent.status_code = 200;
    wideEvent.rows = rowCount;

    return Response.json({ success: true, data });
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
