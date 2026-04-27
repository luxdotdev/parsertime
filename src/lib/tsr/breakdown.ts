import prisma from "@/lib/prisma";
import {
  RECENCY_HALF_LIFE_DAYS,
  TIER_PRIORS,
  TIER_RANK,
  movMultiplier,
  recencyWeight,
} from "@/lib/tsr/constants";
import { FaceitTier, type TsrRegion } from "@prisma/client";

export type TsrBreakdownFactor = {
  key: "winRate" | "recentActivity" | "tierStrength" | "marginOfVictory" | "matchVolume";
  label: string;
  value: number; // 0-1 normalized
  rawLabel: string; // human-readable raw value, e.g. "63% wins"
};

export type TsrBreakdownMatch = {
  matchId: string;
  finishedAt: Date;
  tier: FaceitTier;
  championshipName: string;
  score: [number, number];
  won: boolean;
  bestOf: number;
  // Approximate impact: closer to 1 = bigger swing this match contributed.
  // Computed from MOV * recency, sign tracks win/loss.
  impactScore: number;
};

export type TsrBreakdown = {
  player: {
    faceitPlayerId: string;
    faceitNickname: string;
    battletag: string | null;
    region: TsrRegion;
    rating: number;
    maxTierReached: FaceitTier;
    matchCount: number;
    recentMatchCount365d: number;
  };
  record: {
    wins: number;
    losses: number;
    winRate: number; // 0-1
    recentWins: number;
    recentLosses: number;
  };
  tierMix: { tier: FaceitTier; matches: number; wins: number; losses: number }[];
  factors: TsrBreakdownFactor[];
  recentMatches: TsrBreakdownMatch[];
  topSwings: TsrBreakdownMatch[];
};

const RECENT_WINDOW_MS = 365 * 86_400_000;

export async function getTsrBreakdown(
  faceitPlayerId: string
): Promise<TsrBreakdown | null> {
  const tsr = await prisma.playerTsr.findUnique({
    where: { faceitPlayerId },
    include: {
      player: {
        select: { faceitNickname: true, battletag: true },
      },
    },
  });
  if (!tsr) return null;

  const rosterRows = await prisma.faceitMatchRoster.findMany({
    where: { faceitPlayerId },
    include: {
      match: {
        select: {
          faceitMatchId: true,
          status: true,
          bestOf: true,
          team1Score: true,
          team2Score: true,
          winnerFaction: true,
          finishedAt: true,
          championship: {
            select: { name: true, tier: true },
          },
        },
      },
    },
  });

  const eligible = rosterRows.filter(
    (r) =>
      r.match.status === "FINISHED" &&
      r.match.championship.tier !== FaceitTier.UNCLASSIFIED &&
      (r.match.winnerFaction === 1 || r.match.winnerFaction === 2)
  );

  const todayMs = Date.now();
  const recentCutoffMs = todayMs - RECENT_WINDOW_MS;

  let wins = 0;
  let losses = 0;
  let recentWins = 0;
  let recentLosses = 0;
  const tierMix = new Map<FaceitTier, { matches: number; wins: number; losses: number }>();
  let movSum = 0;
  let movCount = 0;
  let tierRankWeighted = 0;
  let tierRankWeight = 0;

  type MatchView = {
    matchId: string;
    finishedAt: Date;
    tier: FaceitTier;
    championshipName: string;
    score: [number, number];
    won: boolean;
    bestOf: number;
    recencyWeight: number;
    movMultiplier: number;
    impactScore: number;
  };
  const matchViews: MatchView[] = [];

  for (const row of eligible) {
    const m = row.match;
    const won = m.winnerFaction === row.teamSide;
    const ageDays = (todayMs - m.finishedAt.getTime()) / 86_400_000;
    const recency = recencyWeight(ageDays);
    const mov = movMultiplier(m.bestOf, m.team1Score, m.team2Score);
    const isRecent = m.finishedAt.getTime() >= recentCutoffMs;

    if (won) {
      wins += 1;
      if (isRecent) recentWins += 1;
      movSum += mov;
      movCount += 1;
    } else {
      losses += 1;
      if (isRecent) recentLosses += 1;
    }

    const bucket = tierMix.get(m.championship.tier) ?? {
      matches: 0,
      wins: 0,
      losses: 0,
    };
    bucket.matches += 1;
    if (won) bucket.wins += 1;
    else bucket.losses += 1;
    tierMix.set(m.championship.tier, bucket);

    const rank = TIER_RANK[m.championship.tier];
    tierRankWeighted += rank * recency;
    tierRankWeight += recency;

    matchViews.push({
      matchId: m.faceitMatchId,
      finishedAt: m.finishedAt,
      tier: m.championship.tier,
      championshipName: m.championship.name,
      score: [m.team1Score, m.team2Score],
      won,
      bestOf: m.bestOf,
      recencyWeight: recency,
      movMultiplier: mov,
      impactScore: (won ? 1 : -1) * mov * recency,
    });
  }

  const totalDecided = wins + losses;
  const winRate = totalDecided > 0 ? wins / totalDecided : 0;
  const avgMovOnWin = movCount > 0 ? movSum / movCount : 0;
  const tierStrength =
    tierRankWeight > 0 ? tierRankWeighted / tierRankWeight / TIER_RANK.OWCS : 0;
  const matchVolume = Math.min(1, totalDecided / 80);
  const recentActivity =
    totalDecided > 0
      ? Math.min(1, tsr.recentMatchCount365d / Math.max(totalDecided, 30))
      : 0;
  // mov range is 0.875 - 1.5; scale to 0-1
  const marginOfVictory =
    avgMovOnWin > 0 ? Math.min(1, Math.max(0, (avgMovOnWin - 0.875) / 0.625)) : 0;

  const factors: TsrBreakdownFactor[] = [
    {
      key: "winRate",
      label: "Win rate",
      value: winRate,
      rawLabel: `${Math.round(winRate * 100)}%`,
    },
    {
      key: "recentActivity",
      label: "Recent activity",
      value: recentActivity,
      rawLabel: `${tsr.recentMatchCount365d} in last 365d`,
    },
    {
      key: "tierStrength",
      label: "Tier strength",
      value: tierStrength,
      rawLabel: `Avg tier ${avgTierLabel(tierStrength * TIER_RANK.OWCS)}`,
    },
    {
      key: "marginOfVictory",
      label: "Win margin",
      value: marginOfVictory,
      rawLabel:
        avgMovOnWin > 0
          ? `${avgMovOnWin.toFixed(2)}× avg`
          : "—",
    },
    {
      key: "matchVolume",
      label: "Match volume",
      value: matchVolume,
      rawLabel: `${totalDecided} matches`,
    },
  ];

  const recentMatches: TsrBreakdownMatch[] = matchViews
    .slice()
    .sort((a, b) => b.finishedAt.getTime() - a.finishedAt.getTime())
    .slice(0, 8)
    .map(toBreakdownMatch);

  const topSwings: TsrBreakdownMatch[] = matchViews
    .slice()
    .sort((a, b) => Math.abs(b.impactScore) - Math.abs(a.impactScore))
    .slice(0, 5)
    .map(toBreakdownMatch);

  const tierMixSorted = [...tierMix.entries()]
    .map(([tier, v]) => ({ tier, ...v }))
    .sort((a, b) => TIER_RANK[b.tier] - TIER_RANK[a.tier]);

  return {
    player: {
      faceitPlayerId: tsr.faceitPlayerId,
      faceitNickname: tsr.player.faceitNickname,
      battletag: tsr.player.battletag,
      region: tsr.region,
      rating: tsr.rating,
      maxTierReached: tsr.maxTierReached,
      matchCount: tsr.matchCount,
      recentMatchCount365d: tsr.recentMatchCount365d,
    },
    record: { wins, losses, winRate, recentWins, recentLosses },
    tierMix: tierMixSorted,
    factors,
    recentMatches,
    topSwings,
  };
}

function toBreakdownMatch(v: {
  matchId: string;
  finishedAt: Date;
  tier: FaceitTier;
  championshipName: string;
  score: [number, number];
  won: boolean;
  bestOf: number;
  impactScore: number;
}): TsrBreakdownMatch {
  return {
    matchId: v.matchId,
    finishedAt: v.finishedAt,
    tier: v.tier,
    championshipName: v.championshipName,
    score: v.score,
    won: v.won,
    bestOf: v.bestOf,
    impactScore: v.impactScore,
  };
}

function avgTierLabel(rank: number): string {
  // Maps a fractional rank back to a readable tier label.
  if (rank >= 4.5) return "OWCS";
  if (rank >= 3.5) return "Masters";
  if (rank >= 2.5) return "Expert";
  if (rank >= 1.5) return "Advanced";
  if (rank > 0) return "Open";
  return "—";
}

export const TIER_FLOOR_MARKERS: { tier: FaceitTier; floor: number; label: string }[] =
  [
    { tier: FaceitTier.OPEN, floor: TIER_PRIORS.OPEN, label: "Open" },
    { tier: FaceitTier.ADVANCED, floor: TIER_PRIORS.ADVANCED, label: "Advanced" },
    { tier: FaceitTier.EXPERT, floor: TIER_PRIORS.EXPERT, label: "Expert" },
    { tier: FaceitTier.MASTERS, floor: TIER_PRIORS.MASTERS, label: "Masters" },
    { tier: FaceitTier.OWCS, floor: TIER_PRIORS.OWCS, label: "OWCS" },
  ];

export const RECENCY_HALF_LIFE_LABEL = `${RECENCY_HALF_LIFE_DAYS}-day half-life`;
