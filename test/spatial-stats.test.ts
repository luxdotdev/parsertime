import {
  computeAverageEngagementDistance,
  computeHighGroundKillPercentage,
  type CoordKill,
} from "@/lib/spatial-stats";
import { expect, test } from "vitest";

export function makeKill(overrides: Partial<CoordKill> = {}): CoordKill {
  return {
    match_time: 100,
    attacker_name: "lux",
    attacker_team: "Team 1",
    victim_name: "enemy",
    victim_team: "Team 2",
    attacker_x: 0,
    attacker_y: 0,
    attacker_z: 0,
    victim_x: 0,
    victim_y: 0,
    victim_z: 0,
    ...overrides,
  };
}

test("average engagement distance over kills with full coordinates", () => {
  // 6 kills (MIN_SAMPLES is 5), victim 10m away on the x axis each time
  const kills = Array.from({ length: 6 }, (_, i) =>
    makeKill({ match_time: 100 + i, victim_x: 10 })
  );
  expect(computeAverageEngagementDistance(kills, "lux")).toBe(10);
});

test("engagement distance is null below MIN_SAMPLES", () => {
  const kills = Array.from({ length: 4 }, () => makeKill({ victim_x: 10 }));
  expect(computeAverageEngagementDistance(kills, "lux")).toBeNull();
});

test("engagement distance is null below MIN_COVERAGE", () => {
  // 5 kills with coords, 6 without → 5/11 < 0.5 coverage
  const withCoords = Array.from({ length: 5 }, () =>
    makeKill({ victim_x: 10 })
  );
  const withoutCoords = Array.from({ length: 6 }, () =>
    makeKill({ attacker_x: null, victim_x: null })
  );
  expect(
    computeAverageEngagementDistance([...withCoords, ...withoutCoords], "lux")
  ).toBeNull();
});

test("engagement distance only counts the player's own kills", () => {
  const mine = Array.from({ length: 6 }, () => makeKill({ victim_x: 10 }));
  const theirs = Array.from({ length: 6 }, () =>
    makeKill({ attacker_name: "someone-else", victim_x: 50 })
  );
  expect(computeAverageEngagementDistance([...mine, ...theirs], "lux")).toBe(
    10
  );
});

test("high ground kill percentage uses the y delta threshold", () => {
  // 3 kills from 6m above (high ground), 3 level kills → 50%
  const high = Array.from({ length: 3 }, () => makeKill({ attacker_y: 6 }));
  const level = Array.from({ length: 3 }, () => makeKill({ attacker_y: 0 }));
  expect(computeHighGroundKillPercentage([...high, ...level], "lux")).toBe(50);
});

test("a small height delta does not count as high ground", () => {
  // 4.9m is below HIGH_GROUND_DELTA (5.0m)
  const kills = Array.from({ length: 6 }, () => makeKill({ attacker_y: 4.9 }));
  expect(computeHighGroundKillPercentage(kills, "lux")).toBe(0);
});

test("high ground percentage is null when y coordinates are missing", () => {
  const kills = Array.from({ length: 6 }, () =>
    makeKill({ attacker_y: null, victim_y: null })
  );
  expect(computeHighGroundKillPercentage(kills, "lux")).toBeNull();
});
