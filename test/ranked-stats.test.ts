import { getSummaryStats, type MatchData } from "@/lib/ranked-stats";
import { expect, test } from "vitest";

function match(partial: Partial<MatchData>): MatchData {
  return {
    id: "m1",
    map: "Ilios",
    mapType: "Control",
    result: "win",
    groupSize: 1,
    playedAt: new Date("2026-01-01T00:00:00Z"),
    createdAt: new Date("2026-01-01T00:00:00Z"),
    heroes: [{ id: "h1", hero: "Ana", role: "Support", percentage: 100 }],
    ...partial,
  };
}

test("getSummaryStats computes wins, losses, and winrate", () => {
  const matches: MatchData[] = [
    match({ id: "a", result: "win" }),
    match({ id: "b", result: "win" }),
    match({ id: "c", result: "loss" }),
  ];

  const stats = getSummaryStats(matches);

  expect(stats.totalMatches).toBe(3);
  expect(stats.wins).toBe(2);
  expect(stats.losses).toBe(1);
  // getSummaryStats uses Math.round((wins / total) * 100)
  // 2/3 * 100 = 66.666... => Math.round = 67
  expect(stats.winrate).toBe(67);
});
