import { Logger } from "@/lib/logger";
import {
  type TsrLeaderboardQuery,
  type TsrSortKey,
  queryTsrLeaderboard,
} from "@/lib/tsr/leaderboard";
import { FaceitTier, TsrRegion } from "@prisma/client";

export const runtime = "nodejs";

const VALID_SORTS: TsrSortKey[] = ["rating", "matches", "recent"];

function parseEnum<T extends string>(
  value: string | null,
  values: readonly T[]
): T | undefined {
  if (!value) return undefined;
  return values.includes(value as T) ? (value as T) : undefined;
}

function parseInt32(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export async function GET(req: Request): Promise<Response> {
  const startTime = Date.now();
  const url = new URL(req.url);
  const wideEvent: Record<string, unknown> = {
    event: "tsr.leaderboard.query",
    method: "GET",
    path: "/api/leaderboard/tsr",
    timestamp: new Date().toISOString(),
  };

  try {
    const query: TsrLeaderboardQuery = {
      region: parseEnum(url.searchParams.get("region"), Object.values(TsrRegion)),
      tier: parseEnum(url.searchParams.get("tier"), Object.values(FaceitTier)),
      sort: parseEnum(url.searchParams.get("sort"), VALID_SORTS) ?? "rating",
      q: url.searchParams.get("q") ?? undefined,
      offset: parseInt32(url.searchParams.get("offset"), 0),
      limit: parseInt32(url.searchParams.get("limit"), 50),
    };
    wideEvent.region = query.region ?? "any";
    wideEvent.tier = query.tier ?? "any";
    wideEvent.sort = query.sort;
    wideEvent.has_search = !!query.q;
    wideEvent.offset = query.offset;
    wideEvent.limit = query.limit;

    const snapshot = await queryTsrLeaderboard(query);
    wideEvent.outcome = "success";
    wideEvent.status_code = 200;
    wideEvent.rows = snapshot.rows.length;
    wideEvent.matched_count = snapshot.meta.matchedCount;

    return Response.json(snapshot);
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
