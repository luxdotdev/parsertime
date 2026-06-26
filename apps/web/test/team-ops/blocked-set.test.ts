import { describe, expect, it } from "vitest";
import { buildBlockedTeamIdSet } from "@/lib/team-ops/blocked-set";

describe("buildBlockedTeamIdSet", () => {
  const searcher = 1;

  it("includes teams the searcher blocked", () => {
    const set = buildBlockedTeamIdSet(
      [{ ownerTeamId: 1, blockedTeamId: 2 }],
      searcher
    );
    expect([...set]).toEqual([2]);
  });

  it("includes teams that blocked the searcher (reverse direction)", () => {
    const set = buildBlockedTeamIdSet(
      [{ ownerTeamId: 3, blockedTeamId: 1 }],
      searcher
    );
    expect([...set]).toEqual([3]);
  });

  it("ignores off-platform rows with a null blockedTeamId", () => {
    const set = buildBlockedTeamIdSet(
      [{ ownerTeamId: 1, blockedTeamId: null }],
      searcher
    );
    expect(set.size).toBe(0);
  });

  it("dedupes when a block exists in both directions", () => {
    const set = buildBlockedTeamIdSet(
      [
        { ownerTeamId: 1, blockedTeamId: 2 },
        { ownerTeamId: 2, blockedTeamId: 1 },
      ],
      searcher
    );
    expect([...set]).toEqual([2]);
  });
});
