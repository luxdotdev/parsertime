import prisma from "@/lib/prisma";
import type { FaceitTier, TsrRegion } from "@prisma/client";

export type TsrLeaderboardRow = {
  faceitPlayerId: string;
  faceitNickname: string;
  battletag: string | null;
  region: TsrRegion;
  rating: number;
  matchCount: number;
  recentMatchCount365d: number;
  maxTierReached: FaceitTier;
  lastMatchAt: Date | null;
};

export type TsrLeaderboardSnapshot = {
  rows: TsrLeaderboardRow[];
  totalActive: number;
  totalAll: number;
  topRating: number;
  totalTrackedMatches: number;
  computedAt: Date | null;
};

const ACTIVE_THRESHOLD = 3;
const PUBLIC_LIMIT = 200;

export async function getTsrLeaderboard(): Promise<TsrLeaderboardSnapshot> {
  const [tsrRows, totalAll, totalTrackedMatches] = await Promise.all([
    prisma.playerTsr.findMany({
      where: { recentMatchCount365d: { gte: ACTIVE_THRESHOLD } },
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
      orderBy: { rating: "desc" },
      take: PUBLIC_LIMIT,
    }),
    prisma.playerTsr.count(),
    prisma.faceitMatch.count({ where: { status: "FINISHED" } }),
  ]);

  const rows: TsrLeaderboardRow[] = tsrRows.map((r) => ({
    faceitPlayerId: r.faceitPlayerId,
    faceitNickname: r.player.faceitNickname,
    battletag: r.player.battletag,
    region: r.region,
    rating: r.rating,
    matchCount: r.matchCount,
    recentMatchCount365d: r.recentMatchCount365d,
    maxTierReached: r.maxTierReached,
    lastMatchAt: r.player.rosterEntries[0]?.match.finishedAt ?? null,
  }));

  return {
    rows,
    totalActive: rows.length,
    totalAll,
    topRating: rows[0]?.rating ?? 0,
    totalTrackedMatches,
    computedAt: tsrRows[0]?.computedAt ?? null,
  };
}
