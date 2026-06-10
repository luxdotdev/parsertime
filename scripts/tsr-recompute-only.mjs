#!/usr/bin/env node

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TIER_PRIORS = {
  UNCLASSIFIED: 2500,
  OPEN: 2500,
  CAH: 2500,
  ADVANCED: 2800,
  EXPERT: 3100,
  MASTERS: 3450,
  OWCS: 3850,
};

const TIER_RANK = {
  UNCLASSIFIED: 0,
  OPEN: 1,
  CAH: 1,
  ADVANCED: 2,
  EXPERT: 3,
  MASTERS: 4,
  OWCS: 5,
};

const DISPLAY_ACTIVITY_WINDOW_DAYS = 365;
const RECENCY_HALF_LIFE_DAYS = 365;
const TSR_HARD_FLOOR = 1;
const TSR_HARD_CEILING = 5000;
const TSR_SOFT_CAP_START = 4000;
const TSR_RECOMPUTE_LOCK_ID = 732401;
const MATCH_PAGE_SIZE = 1000;
const UPSERT_CHUNK_SIZE = 500;

function kBase(matchCount) {
  if (matchCount < 5) return 48;
  if (matchCount < 15) return 32;
  if (matchCount < 30) return 24;
  return 16;
}

function movMultiplier(bestOf, scoreA, scoreB) {
  const maxDiff = Math.ceil(bestOf / 2);
  if (maxDiff <= 0) return 1;
  const actualDiff = Math.abs(scoreA - scoreB);
  const closeness = (maxDiff - actualDiff) / maxDiff;
  return 1.5 - closeness;
}

function gainDampener(rating, deltaSign) {
  if (deltaSign <= 0) return 1;
  if (rating <= TSR_SOFT_CAP_START) return 1;
  const x = (rating - TSR_SOFT_CAP_START) / 1000;
  return Math.max(0, 1 - x * x);
}

function recencyWeight(ageDays) {
  return Math.pow(0.5, ageDays / RECENCY_HALF_LIFE_DAYS);
}

function clampRating(x) {
  return Math.max(TSR_HARD_FLOOR, Math.min(TSR_HARD_CEILING, x));
}

async function loadReplayMatches() {
  const out = [];
  let page = 0;

  for (;;) {
    const rows = await prisma.faceitMatch.findMany({
      where: {
        status: "FINISHED",
        championship: { tier: { not: "UNCLASSIFIED" } },
      },
      select: {
        faceitMatchId: true,
        finishedAt: true,
        bestOf: true,
        team1Score: true,
        team2Score: true,
        winnerFaction: true,
        championship: { select: { tier: true } },
      },
      orderBy: [{ finishedAt: "asc" }, { faceitMatchId: "asc" }],
      skip: page * MATCH_PAGE_SIZE,
      take: MATCH_PAGE_SIZE,
    });

    if (rows.length === 0) break;

    const matchIds = rows.map((m) => m.faceitMatchId);
    const [rosters, overrides] = await Promise.all([
      prisma.faceitMatchRoster.findMany({
        where: { matchId: { in: matchIds } },
        select: { matchId: true, teamSide: true, faceitPlayerId: true },
      }),
      prisma.tsrRosterOverride.findMany({
        where: { matchId: { in: matchIds } },
        select: {
          matchId: true,
          faceitPlayerId: true,
          action: true,
          teamSide: true,
        },
      }),
    ]);

    const rostersByMatch = new Map();
    for (const roster of rosters) {
      const list = rostersByMatch.get(roster.matchId) ?? [];
      list.push(roster);
      rostersByMatch.set(roster.matchId, list);
    }

    const overridesByMatch = new Map();
    for (const override of overrides) {
      const list = overridesByMatch.get(override.matchId) ?? [];
      list.push(override);
      overridesByMatch.set(override.matchId, list);
    }

    for (const match of rows) {
      const matchRosters = rostersByMatch.get(match.faceitMatchId) ?? [];
      const matchOverrides = overridesByMatch.get(match.faceitMatchId) ?? [];
      const exclude = new Set(
        matchOverrides
          .filter((o) => o.action === "EXCLUDE")
          .map((o) => o.faceitPlayerId)
      );
      const includeBySide = { 1: [], 2: [] };
      for (const override of matchOverrides) {
        if (
          override.action === "INCLUDE" &&
          (override.teamSide === 1 || override.teamSide === 2)
        ) {
          includeBySide[override.teamSide].push(override.faceitPlayerId);
        }
      }

      const faction1 = matchRosters
        .filter((r) => r.teamSide === 1 && !exclude.has(r.faceitPlayerId))
        .map((r) => r.faceitPlayerId)
        .concat(includeBySide[1]);
      const faction2 = matchRosters
        .filter((r) => r.teamSide === 2 && !exclude.has(r.faceitPlayerId))
        .map((r) => r.faceitPlayerId)
        .concat(includeBySide[2]);

      if (faction1.length === 0 || faction2.length === 0) continue;
      if (match.winnerFaction !== 1 && match.winnerFaction !== 2) continue;

      out.push({
        matchId: match.faceitMatchId,
        finishedAt: match.finishedAt,
        bestOf: match.bestOf,
        team1Score: match.team1Score,
        team2Score: match.team2Score,
        winnerFaction: match.winnerFaction,
        tier: match.championship.tier,
        faction1,
        faction2,
      });
    }

    page += 1;
    console.log(`loaded ${out.length} replayable matches...`);
  }

  return out;
}

async function recomputeAllTsrs() {
  const lockStart = Date.now();
  const [lock] = await prisma.$queryRaw`
    SELECT pg_try_advisory_lock(${TSR_RECOMPUTE_LOCK_ID}) AS locked
  `;
  if (!lock?.locked) {
    return {
      matchesReplayed: 0,
      playersUpdated: 0,
      staleRowsDropped: 0,
      durationMs: Date.now() - lockStart,
      skipped: true,
    };
  }

  try {
    return await recomputeAllTsrsUnlocked();
  } finally {
    await prisma.$executeRaw`
      SELECT pg_advisory_unlock(${TSR_RECOMPUTE_LOCK_ID})
    `;
  }
}

async function recomputeAllTsrsUnlocked() {
  const start = Date.now();
  const matches = await loadReplayMatches();

  const maxTierByPlayer = new Map();
  for (const match of matches) {
    for (const pid of [...match.faction1, ...match.faction2]) {
      const cur = maxTierByPlayer.get(pid);
      if (!cur || TIER_RANK[match.tier] > TIER_RANK[cur]) {
        maxTierByPlayer.set(pid, match.tier);
      }
    }
  }

  const states = new Map();
  function ensure(pid) {
    let state = states.get(pid);
    if (!state) {
      const tier = maxTierByPlayer.get(pid) ?? "UNCLASSIFIED";
      state = {
        rating: TIER_PRIORS[tier],
        matchCount: 0,
        recentCount: 0,
        maxTier: tier,
      };
      states.set(pid, state);
    }
    return state;
  }

  const todayMs = Date.now();
  const recentCutoffMs =
    todayMs - DISPLAY_ACTIVITY_WINDOW_DAYS * 86400 * 1000;

  let replayed = 0;
  for (const match of matches) {
    const ageDays =
      (todayMs - match.finishedAt.getTime()) / (1000 * 60 * 60 * 24);
    const recency = recencyWeight(ageDays);
    const mov = movMultiplier(match.bestOf, match.team1Score, match.team2Score);
    const isRecent = match.finishedAt.getTime() >= recentCutoffMs;

    const f1States = match.faction1.map(ensure);
    const f2States = match.faction2.map(ensure);
    const f1Avg =
      f1States.reduce((sum, player) => sum + player.rating, 0) /
      f1States.length;
    const f2Avg =
      f2States.reduce((sum, player) => sum + player.rating, 0) /
      f2States.length;

    function updateSide(side, oppAvg, won) {
      for (const player of side) {
        const expected = 1 / (1 + Math.pow(10, (oppAvg - player.rating) / 400));
        const actual = won ? 1 : 0;
        const k = kBase(player.matchCount);
        const baseDelta = k * mov * recency * (actual - expected);
        const dampener = gainDampener(player.rating, baseDelta);
        const delta = baseDelta * dampener;
        player.rating = clampRating(player.rating + delta);
        player.matchCount += 1;
        if (isRecent) player.recentCount += 1;
      }
    }

    const f1Won = match.winnerFaction === 1;
    updateSide(f1States, f2Avg, f1Won);
    updateSide(f2States, f1Avg, !f1Won);

    replayed += 1;
    if (replayed % 5000 === 0) {
      console.log(`replayed ${replayed}/${matches.length} matches...`);
    }
  }

  const ids = [...states.keys()];
  const computedAt = new Date();
  const playerRows = ids.length
    ? await prisma.faceitPlayer.findMany({
        where: { faceitPlayerId: { in: ids } },
        select: { faceitPlayerId: true, region: true },
      })
    : [];
  const regionByPlayer = new Map(
    playerRows.map((row) => [row.faceitPlayerId, row.region])
  );

  let updated = 0;
  for (let i = 0; i < ids.length; i += UPSERT_CHUNK_SIZE) {
    const slice = ids.slice(i, i + UPSERT_CHUNK_SIZE);
    await prisma.$transaction(
      slice.map((pid) => {
        const state = states.get(pid);
        const region = regionByPlayer.get(pid) ?? "OTHER";
        return prisma.playerTsr.upsert({
          where: { faceitPlayerId: pid },
          create: {
            faceitPlayerId: pid,
            region,
            rating: Math.round(state.rating),
            matchCount: state.matchCount,
            recentMatchCount365d: state.recentCount,
            maxTierReached: state.maxTier,
            computedAt,
          },
          update: {
            region,
            rating: Math.round(state.rating),
            matchCount: state.matchCount,
            recentMatchCount365d: state.recentCount,
            maxTierReached: state.maxTier,
            computedAt,
          },
        });
      })
    );
    updated += slice.length;
    console.log(`upserted ${updated}/${ids.length} player TSR rows...`);
  }

  const stale = await prisma.playerTsr.deleteMany({
    where: { computedAt: { lt: computedAt } },
  });

  return {
    matchesReplayed: matches.length,
    playersUpdated: updated,
    staleRowsDropped: stale.count,
    durationMs: Date.now() - start,
  };
}

try {
  const result = await recomputeAllTsrs();
  console.log(JSON.stringify(result, null, 2));
} finally {
  await prisma.$disconnect();
}
