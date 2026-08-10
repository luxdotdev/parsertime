import { afterEach, beforeEach, expect, test, vi } from "vitest";

const { findMatches, findPlayers, transaction } = vi.hoisted(() => ({
  findMatches: vi.fn(),
  findPlayers: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    $transaction: transaction,
  },
}));

import { buildTsrReplayPlan } from "@/lib/tsr/replay";

const FINISHED_AT = new Date("2026-08-10T12:00:00.000Z");

function replayRow(index: number, tier = "OPEN") {
  return {
    faceitMatchId: `match-${String(index).padStart(4, "0")}`,
    finishedAt: FINISHED_AT,
    bestOf: 3,
    team1Score: 3,
    team2Score: 1,
    winnerFaction: 1,
    championship: { tier },
    rosters: [
      { teamSide: 1, faceitPlayerId: "player-1" },
      { teamSide: 2, faceitPlayerId: "player-2" },
    ],
    rosterOverrides: [],
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-10T13:00:00.000Z"));
  findMatches.mockReset();
  findPlayers.mockReset().mockResolvedValue([
    { faceitPlayerId: "player-1", region: "NA" },
    { faceitPlayerId: "player-2", region: "NA" },
  ]);
  transaction.mockReset().mockImplementation((callback) =>
    callback({
      faceitMatch: { findMany: findMatches },
      faceitPlayer: { findMany: findPlayers },
    })
  );
});

afterEach(() => {
  vi.useRealTimers();
});

test("builds the replay plan through bounded, narrowly selected batches", async () => {
  const firstBatch = Array.from({ length: 500 }, (_, index) =>
    replayRow(index)
  );
  const finalBatch = [replayRow(500, "MASTERS")];
  findMatches
    .mockResolvedValueOnce(firstBatch)
    .mockResolvedValueOnce(finalBatch)
    .mockResolvedValueOnce(firstBatch)
    .mockResolvedValueOnce(finalBatch);

  const plan = await buildTsrReplayPlan();

  expect(plan.matchesReplayed).toBe(501);
  expect(plan.players).toHaveLength(2);
  expect(plan.players.map((player) => player.matchCount)).toEqual([501, 501]);
  expect(plan.players.map((player) => player.maxTierReached)).toEqual([
    "MASTERS",
    "MASTERS",
  ]);
  expect(plan.players.map((player) => player.rating)).toEqual([3881, 3019]);
  expect(transaction).toHaveBeenCalledWith(expect.any(Function), {
    isolationLevel: "RepeatableRead",
    maxWait: 20_000,
    timeout: 120_000,
  });
  expect(findMatches).toHaveBeenCalledTimes(4);

  const firstQuery = findMatches.mock.calls[0][0];
  expect(firstQuery).not.toHaveProperty("include");
  expect(firstQuery.take).toBe(500);
  expect(firstQuery.orderBy).toEqual([
    { finishedAt: "asc" },
    { faceitMatchId: "asc" },
  ]);
  expect(firstQuery.select).toEqual({
    faceitMatchId: true,
    finishedAt: true,
    bestOf: true,
    team1Score: true,
    team2Score: true,
    winnerFaction: true,
    championship: { select: { tier: true } },
    rosters: { select: { teamSide: true, faceitPlayerId: true } },
    rosterOverrides: {
      select: { faceitPlayerId: true, action: true, teamSide: true },
    },
  });
  expect(firstQuery.select).not.toHaveProperty("rawDetails");
  expect(firstQuery.select).not.toHaveProperty("rawVoting");

  const secondQuery = findMatches.mock.calls[1][0];
  expect(secondQuery.where.OR).toEqual([
    { finishedAt: { gt: FINISHED_AT } },
    {
      finishedAt: FINISHED_AT,
      faceitMatchId: { gt: "match-0499" },
    },
  ]);

  expect(firstQuery.where).not.toHaveProperty("ingestedAt");
});
