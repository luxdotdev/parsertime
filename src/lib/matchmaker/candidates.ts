import { adjacentBuckets, sameBucket } from "@/lib/matchmaker/adjacency";
import {
  computeAvailabilityOverlapHours,
  loadCurrentTeamAvailability,
} from "@/lib/matchmaker/availability";
import { upsertTeamTsrSnapshot } from "@/lib/matchmaker/snapshot";
import prisma from "@/lib/prisma";
import type { FaceitTier, TeamTsrSource, TsrRegion } from "@prisma/client";

const W_REGION = 1.0;
const W_BRACKET = 0.5;
const W_DISTANCE = 1.5;
const W_AVAIL = 0.3;
const W_COOLDOWN = 2.0;
const HOURS_PER_WEEK = 168;
const TOP_N = 30;
const COOLDOWN_HOURS = 24;

export type SearcherContext = {
  rating: number;
  region: TsrRegion;
  bracketTier: FaceitTier;
  bracketBand: string | null;
};

export type CandidateInput = {
  rating: number;
  region: TsrRegion;
  bracketTier: FaceitTier;
  bracketBand: string | null;
  cooldownActive: boolean;
  overlapHours: number;
};

export function scoreCandidate(s: SearcherContext, c: CandidateInput): number {
  const sameRegion = c.region === s.region;
  const same = sameBucket(
    { bracketTier: s.bracketTier, bracketBand: s.bracketBand },
    { bracketTier: c.bracketTier, bracketBand: c.bracketBand }
  );
  const adj = adjacentBuckets({
    bracketTier: s.bracketTier,
    bracketBand: s.bracketBand,
  }).some((b) =>
    sameBucket(b, { bracketTier: c.bracketTier, bracketBand: c.bracketBand })
  );
  const bracketScore = same ? 3 : adj ? 2 : 0;
  const distance = Math.abs(c.rating - s.rating);

  return (
    W_REGION * (sameRegion ? 1 : 0) +
    W_BRACKET * bracketScore -
    (W_DISTANCE * distance) / 1000 +
    (W_AVAIL * c.overlapHours) / HOURS_PER_WEEK -
    W_COOLDOWN * (c.cooldownActive ? 1 : 0)
  );
}

export type MatchmakerCandidate = {
  teamId: number;
  teamName: string;
  teamImage: string | null;
  rating: number;
  region: TsrRegion;
  bracketTier: FaceitTier;
  bracketBand: string | null;
  source: TeamTsrSource;
  ratedCount: number;
  rosterSize: number;
  delta: number; // candidate - searcher (signed)
  cooldownActive: boolean;
  cooledUntil: Date | null;
  overlapHours: number;
  score: number;
};

export type SearcherSummary = {
  teamId: number;
  teamName: string;
  rating: number;
  bracketTier: FaceitTier;
  bracketBand: string | null;
  region: TsrRegion;
  source: TeamTsrSource;
  requestsRemaining: number;
};

export type CandidatesResult =
  | { kind: "ok"; searcher: SearcherSummary; candidates: MatchmakerCandidate[] }
  | { kind: "no-snapshot" };

export async function getMatchmakerCandidates(
  searcherTeamId: number
): Promise<CandidatesResult> {
  // Refresh the searcher's snapshot so they always see their current TSR.
  await upsertTeamTsrSnapshot(searcherTeamId);

  const snap = await prisma.teamTsrSnapshot.findUnique({
    where: { teamId: searcherTeamId },
    include: { team: { select: { name: true } } },
  });
  if (!snap) return { kind: "no-snapshot" };

  const since = new Date(Date.now() - COOLDOWN_HOURS * 3_600_000);
  const [pool, recentRequests, sentInLast24h, searcherAvail] =
    await Promise.all([
      prisma.teamTsrSnapshot.findMany({
        where: {
          teamId: { not: searcherTeamId },
          team: { readonly: false },
        },
        include: { team: { select: { id: true, name: true, image: true } } },
      }),
      prisma.scrimRequest.findMany({
        where: { fromTeamId: searcherTeamId, createdAt: { gt: since } },
        select: { toTeamId: true, createdAt: true },
      }),
      prisma.scrimRequest.count({
        where: { fromTeamId: searcherTeamId, createdAt: { gt: since } },
      }),
      loadCurrentTeamAvailability(searcherTeamId),
    ]);

  // Compute overlap per candidate. Sequential to avoid hammering the DB
  // with hundreds of parallel availability queries.
  const candidates: MatchmakerCandidate[] = [];
  for (const c of pool) {
    const cooldown = recentRequests.find((r) => r.toTeamId === c.teamId);
    const candidateAvail = searcherAvail
      ? await loadCurrentTeamAvailability(c.teamId)
      : null;
    const overlap = computeAvailabilityOverlapHours({
      a: searcherAvail,
      b: candidateAvail,
    });
    const score = scoreCandidate(
      {
        rating: snap.rating,
        region: snap.region,
        bracketTier: snap.bracketTier,
        bracketBand: snap.bracketBand,
      },
      {
        rating: c.rating,
        region: c.region,
        bracketTier: c.bracketTier,
        bracketBand: c.bracketBand,
        cooldownActive: !!cooldown,
        overlapHours: overlap,
      }
    );
    candidates.push({
      teamId: c.teamId,
      teamName: c.team.name,
      teamImage: c.team.image,
      rating: c.rating,
      region: c.region,
      bracketTier: c.bracketTier,
      bracketBand: c.bracketBand,
      source: c.source,
      ratedCount: c.ratedCount,
      rosterSize: c.rosterSize,
      delta: c.rating - snap.rating,
      cooldownActive: !!cooldown,
      cooledUntil: cooldown
        ? new Date(cooldown.createdAt.getTime() + COOLDOWN_HOURS * 3_600_000)
        : null,
      overlapHours: overlap,
      score,
    });
  }

  candidates.sort((a, b) => b.score - a.score);
  const top = candidates.slice(0, TOP_N);

  return {
    kind: "ok",
    searcher: {
      teamId: snap.teamId,
      teamName: snap.team.name,
      rating: snap.rating,
      bracketTier: snap.bracketTier,
      bracketBand: snap.bracketBand,
      region: snap.region,
      source: snap.source,
      requestsRemaining: Math.max(0, 10 - sentInLast24h),
    },
    candidates: top,
  };
}
