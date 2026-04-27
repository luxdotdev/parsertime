import prisma from "@/lib/prisma";
import type { FaceitTier, Prisma, TsrRegion } from "@prisma/client";

export type TsrLeaderboardRow = {
  rank: number;
  faceitPlayerId: string;
  faceitNickname: string;
  battletag: string | null;
  region: TsrRegion;
  rating: number;
  matchCount: number;
  recentMatchCount365d: number;
  maxTierReached: FaceitTier;
  lastMatchAt: Date | null;
  inactive: boolean;
};

export type TsrLeaderboardMeta = {
  totalActive: number;
  totalAll: number;
  topRating: number;
  totalTrackedMatches: number;
  computedAt: Date | null;
  matchedCount: number;
  hasMore: boolean;
  offset: number;
  limit: number;
};

export type TsrLeaderboardSnapshot = {
  rows: TsrLeaderboardRow[];
  meta: TsrLeaderboardMeta;
};

export type TsrSortKey = "rating" | "matches" | "recent";

export type TsrLeaderboardQuery = {
  region?: TsrRegion;
  tier?: FaceitTier;
  sort?: TsrSortKey;
  q?: string;
  offset?: number;
  limit?: number;
};

const ACTIVE_THRESHOLD = 3;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function compareRows(sort: TsrSortKey) {
  return (a: TsrLeaderboardRow, b: TsrLeaderboardRow) => {
    if (sort === "matches") {
      if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
      return b.rating - a.rating;
    }
    if (sort === "recent") {
      if (b.recentMatchCount365d !== a.recentMatchCount365d) {
        return b.recentMatchCount365d - a.recentMatchCount365d;
      }
      return b.rating - a.rating;
    }
    return b.rating - a.rating;
  };
}

export async function queryTsrLeaderboard(
  params: TsrLeaderboardQuery
): Promise<TsrLeaderboardSnapshot> {
  const sort: TsrSortKey = params.sort ?? "rating";
  const offset = Math.max(0, params.offset ?? 0);
  const limit = Math.max(1, Math.min(MAX_LIMIT, params.limit ?? DEFAULT_LIMIT));
  const q = params.q?.trim() ?? "";
  const hasSearch = q.length > 0;

  const where: Prisma.PlayerTsrWhereInput = {};
  if (params.region) where.region = params.region;
  if (params.tier) where.maxTierReached = params.tier;

  // Pull every PlayerTsr matching region/tier so we can rank deterministically
  // before applying activity / search filters. This pool is bounded by the
  // size of the player population (low thousands) and we only fetch the
  // fields needed to compute rank.
  const pool = await prisma.playerTsr.findMany({
    where,
    select: {
      faceitPlayerId: true,
      rating: true,
      matchCount: true,
      recentMatchCount365d: true,
    },
  });

  const ranked = pool
    .map((p) => ({
      faceitPlayerId: p.faceitPlayerId,
      rating: p.rating,
      matchCount: p.matchCount,
      recentMatchCount365d: p.recentMatchCount365d,
    }))
    .sort((a, b) => {
      if (sort === "matches") return b.matchCount - a.matchCount || b.rating - a.rating;
      if (sort === "recent")
        return b.recentMatchCount365d - a.recentMatchCount365d || b.rating - a.rating;
      return b.rating - a.rating;
    });
  const rankByPlayer = new Map<string, number>();
  for (let i = 0; i < ranked.length; i++) {
    rankByPlayer.set(ranked[i].faceitPlayerId, i + 1);
  }

  // Now decide which rows the user actually sees. Default board hides
  // inactive players. Search relaxes that so users can find themselves
  // even when below the activity threshold.
  let surfaceIds: string[];
  if (hasSearch) {
    const matched = await prisma.playerTsr.findMany({
      where: {
        ...where,
        OR: [
          { player: { faceitNickname: { contains: q, mode: "insensitive" } } },
          { player: { battletag: { contains: q, mode: "insensitive" } } },
        ],
      },
      select: { faceitPlayerId: true },
    });
    const matchedSet = new Set(matched.map((m) => m.faceitPlayerId));
    surfaceIds = ranked
      .map((r) => r.faceitPlayerId)
      .filter((id) => matchedSet.has(id));
  } else {
    surfaceIds = ranked
      .filter((r) => r.recentMatchCount365d >= ACTIVE_THRESHOLD)
      .map((r) => r.faceitPlayerId);
  }

  const matchedCount = surfaceIds.length;
  const pagedIds = surfaceIds.slice(offset, offset + limit);
  const hasMore = offset + limit < surfaceIds.length;

  // Aggregates and full-detail fetch for the paged slice.
  const [details, totalActive, totalAll, totalTrackedMatches] = await Promise.all([
    pagedIds.length > 0
      ? prisma.playerTsr.findMany({
          where: { faceitPlayerId: { in: pagedIds } },
          include: {
            player: {
              select: {
                faceitNickname: true,
                battletag: true,
                rosterEntries: {
                  select: { match: { select: { finishedAt: true } } },
                  orderBy: { match: { finishedAt: "desc" } },
                  take: 1,
                },
              },
            },
          },
        })
      : Promise.resolve([] as Prisma.PromiseReturnType<
          typeof prisma.playerTsr.findMany<{
            include: {
              player: {
                select: {
                  faceitNickname: true;
                  battletag: true;
                  rosterEntries: {
                    select: { match: { select: { finishedAt: true } } };
                    orderBy: { match: { finishedAt: "desc" } };
                    take: 1;
                  };
                };
              };
            };
          }>
        >),
    prisma.playerTsr.count({
      where: { recentMatchCount365d: { gte: ACTIVE_THRESHOLD } },
    }),
    prisma.playerTsr.count(),
    prisma.faceitMatch.count({ where: { status: "FINISHED" } }),
  ]);

  const detailById = new Map(details.map((d) => [d.faceitPlayerId, d]));
  const rows: TsrLeaderboardRow[] = pagedIds.flatMap((id) => {
    const d = detailById.get(id);
    if (!d) return [];
    return [
      {
        rank: rankByPlayer.get(id) ?? 0,
        faceitPlayerId: d.faceitPlayerId,
        faceitNickname: d.player.faceitNickname,
        battletag: d.player.battletag,
        region: d.region,
        rating: d.rating,
        matchCount: d.matchCount,
        recentMatchCount365d: d.recentMatchCount365d,
        maxTierReached: d.maxTierReached,
        lastMatchAt: d.player.rosterEntries[0]?.match.finishedAt ?? null,
        inactive: d.recentMatchCount365d < ACTIVE_THRESHOLD,
      },
    ];
  });
  rows.sort(compareRows(sort));

  const topRating = ranked[0]?.rating ?? 0;
  const computedAt =
    details[0]?.computedAt ??
    (await prisma.playerTsr.findFirst({ select: { computedAt: true } }))?.computedAt ??
    null;

  return {
    rows,
    meta: {
      totalActive,
      totalAll,
      topRating,
      totalTrackedMatches,
      computedAt,
      matchedCount,
      hasMore,
      offset,
      limit,
    },
  };
}

// Initial server-rendered snapshot for SSR. Top page of the active board.
export async function getInitialTsrLeaderboard(): Promise<TsrLeaderboardSnapshot> {
  return queryTsrLeaderboard({ limit: 50 });
}
