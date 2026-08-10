import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import {
  DISPLAY_ACTIVITY_WINDOW_DAYS,
  TIER_PRIORS,
  TIER_RANK,
  clampRating,
  gainDampener,
  kBase,
  movMultiplier,
  recencyWeight,
} from "@/lib/tsr/constants";
import {
  FaceitMatchStatus,
  FaceitTier,
  TsrRegion,
  TsrRosterOverrideAction,
} from "@/generated/prisma/browser";

type ReplayMatch = {
  matchId: string;
  finishedAt: Date;
  bestOf: number;
  team1Score: number;
  team2Score: number;
  winnerFaction: number;
  tier: FaceitTier;
  faction1: string[];
  faction2: string[];
};

type PlayerState = {
  rating: number;
  matchCount: number;
  recentCount: number;
  maxTier: FaceitTier;
};

export type RecomputeResult = {
  matchesReplayed: number;
  playersUpdated: number;
  staleRowsDropped: number;
  durationMs: number;
  skipped?: boolean;
};

export type TsrPlayerWriteRow = {
  faceitPlayerId: string;
  region: TsrRegion;
  rating: number;
  matchCount: number;
  recentMatchCount365d: number;
  maxTierReached: FaceitTier;
};

export type TsrReplayPlan = {
  matchesReplayed: number;
  computedAt: string;
  players: TsrPlayerWriteRow[];
  durationMs: number;
};

async function loadReplayMatches(): Promise<ReplayMatch[]> {
  const rows = await prisma.faceitMatch.findMany({
    where: {
      status: FaceitMatchStatus.FINISHED,
      championship: { tier: { not: FaceitTier.UNCLASSIFIED } },
    },
    include: {
      championship: { select: { tier: true } },
      rosters: { select: { teamSide: true, faceitPlayerId: true } },
      rosterOverrides: {
        select: { faceitPlayerId: true, action: true, teamSide: true },
      },
    },
    orderBy: { finishedAt: "asc" },
  });

  const out: ReplayMatch[] = [];
  for (const m of rows) {
    const exclude = new Set(
      m.rosterOverrides
        .filter((o) => o.action === TsrRosterOverrideAction.EXCLUDE)
        .map((o) => o.faceitPlayerId)
    );
    const includeBySide: Record<1 | 2, string[]> = { 1: [], 2: [] };
    for (const o of m.rosterOverrides) {
      if (
        o.action === TsrRosterOverrideAction.INCLUDE &&
        (o.teamSide === 1 || o.teamSide === 2)
      ) {
        includeBySide[o.teamSide].push(o.faceitPlayerId);
      }
    }

    const f1 = m.rosters
      .filter((r) => r.teamSide === 1 && !exclude.has(r.faceitPlayerId))
      .map((r) => r.faceitPlayerId)
      .concat(includeBySide[1]);
    const f2 = m.rosters
      .filter((r) => r.teamSide === 2 && !exclude.has(r.faceitPlayerId))
      .map((r) => r.faceitPlayerId)
      .concat(includeBySide[2]);

    if (f1.length === 0 || f2.length === 0) continue;
    if (m.winnerFaction !== 1 && m.winnerFaction !== 2) continue;

    out.push({
      matchId: m.faceitMatchId,
      finishedAt: m.finishedAt,
      bestOf: m.bestOf,
      team1Score: m.team1Score,
      team2Score: m.team2Score,
      winnerFaction: m.winnerFaction,
      tier: m.championship.tier,
      faction1: f1,
      faction2: f2,
    });
  }
  return out;
}

export async function recomputeAllTsrs(): Promise<RecomputeResult> {
  const plan = await buildTsrReplayPlan();
  const chunkSize = 500;
  for (let index = 0; index < plan.players.length; index += chunkSize) {
    await writeTsrPlayerBatch(
      plan.players.slice(index, index + chunkSize),
      plan.computedAt
    );
  }
  const staleRowsDropped = await dropStaleTsrRows(plan.computedAt);
  const durationMs = plan.durationMs;
  Logger.info({
    event: "tsr.recompute",
    matches_replayed: plan.matchesReplayed,
    players_updated: plan.players.length,
    stale_rows_dropped: staleRowsDropped,
    duration_ms: durationMs,
    outcome: "success",
  });
  return {
    matchesReplayed: plan.matchesReplayed,
    playersUpdated: plan.players.length,
    staleRowsDropped,
    durationMs,
  };
}

/** Build the authoritative replay output without mutating PlayerTsr rows. */
export async function buildTsrReplayPlan(): Promise<TsrReplayPlan> {
  const start = Date.now();
  const matches = await loadReplayMatches();

  const maxTierByPlayer = new Map<string, FaceitTier>();
  for (const m of matches) {
    for (const pid of [...m.faction1, ...m.faction2]) {
      const cur = maxTierByPlayer.get(pid);
      if (!cur || TIER_RANK[m.tier] > TIER_RANK[cur]) {
        maxTierByPlayer.set(pid, m.tier);
      }
    }
  }

  const states = new Map<string, PlayerState>();
  function ensure(pid: string): PlayerState {
    let s = states.get(pid);
    if (!s) {
      const t = maxTierByPlayer.get(pid) ?? FaceitTier.UNCLASSIFIED;
      s = { rating: TIER_PRIORS[t], matchCount: 0, recentCount: 0, maxTier: t };
      states.set(pid, s);
    }
    return s;
  }

  const todayMs = Date.now();
  const recentCutoffMs = todayMs - DISPLAY_ACTIVITY_WINDOW_DAYS * 86400 * 1000;

  for (const m of matches) {
    const ageDays = (todayMs - m.finishedAt.getTime()) / (1000 * 60 * 60 * 24);
    const recency = recencyWeight(ageDays);
    const mov = movMultiplier(m.bestOf, m.team1Score, m.team2Score);
    const isRecent = m.finishedAt.getTime() >= recentCutoffMs;

    const f1States = m.faction1.map(ensure);
    const f2States = m.faction2.map(ensure);
    const f1Avg = f1States.reduce((s, p) => s + p.rating, 0) / f1States.length;
    const f2Avg = f2States.reduce((s, p) => s + p.rating, 0) / f2States.length;

    function updateSide(side: PlayerState[], oppAvg: number, won: boolean) {
      for (const p of side) {
        const expected = 1 / (1 + Math.pow(10, (oppAvg - p.rating) / 400));
        const actual = won ? 1 : 0;
        const k = kBase(p.matchCount);
        const baseDelta = k * mov * recency * (actual - expected);
        const dampener = gainDampener(p.rating, baseDelta);
        const delta = baseDelta * dampener;
        p.rating = clampRating(p.rating + delta);
        p.matchCount += 1;
        if (isRecent) p.recentCount += 1;
      }
    }
    const f1Won = m.winnerFaction === 1;
    updateSide(f1States, f2Avg, f1Won);
    updateSide(f2States, f1Avg, !f1Won);
  }

  // Recompute is authoritative — every row gets this run's computedAt, and
  // anything older at the end is unbacked by current data and gets deleted.
  // The deletion runs after all upserts succeed so a partial failure can't
  // wipe rows that just weren't reached yet.
  const ids = [...states.keys()];
  const computedAt = new Date();
  const playerRows = ids.length
    ? await prisma.faceitPlayer.findMany({
        where: { faceitPlayerId: { in: ids } },
        select: { faceitPlayerId: true, region: true },
      })
    : [];
  const regionByPlayer = new Map(
    playerRows.map((r) => [r.faceitPlayerId, r.region])
  );

  return {
    matchesReplayed: matches.length,
    computedAt: computedAt.toISOString(),
    players: ids.map((pid) => {
      const state = states.get(pid)!;
      return {
        faceitPlayerId: pid,
        region: regionByPlayer.get(pid) ?? TsrRegion.OTHER,
        rating: Math.round(state.rating),
        matchCount: state.matchCount,
        recentMatchCount365d: state.recentCount,
        maxTierReached: state.maxTier,
      };
    }),
    durationMs: Date.now() - start,
  };
}

/** Idempotently persist one durable replay checkpoint. */
export async function writeTsrPlayerBatch(
  rows: TsrPlayerWriteRow[],
  computedAtIso: string
): Promise<number> {
  const computedAt = new Date(computedAtIso);
  await prisma.$transaction(
    rows.map((row) =>
      prisma.playerTsr.upsert({
        where: { faceitPlayerId: row.faceitPlayerId },
        create: { ...row, computedAt },
        update: {
          region: row.region,
          rating: row.rating,
          matchCount: row.matchCount,
          recentMatchCount365d: row.recentMatchCount365d,
          maxTierReached: row.maxTierReached,
          computedAt,
        },
      })
    )
  );
  return rows.length;
}

/** Drop old rows only after every replay batch has committed. */
export async function dropStaleTsrRows(computedAtIso: string): Promise<number> {
  const stale = await prisma.playerTsr.deleteMany({
    where: { computedAt: { lt: new Date(computedAtIso) } },
  });
  return stale.count;
}
