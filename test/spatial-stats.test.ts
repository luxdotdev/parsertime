import {
  computeAverageEngagementDistance,
  computeAverageFightStartSpread,
  computeHighGroundKillPercentage,
  computeIsolationDeathPercentage,
  ISOLATION_RADIUS,
  samplePositionsAt,
  type CoordKill,
  type SpatialPositionSample,
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

function makeSample(
  overrides: Partial<SpatialPositionSample> = {}
): SpatialPositionSample {
  return {
    match_time: 95,
    playerName: "teammate",
    playerTeam: "Team 1",
    x: 0,
    y: 0,
    z: 0,
    ...overrides,
  };
}

test("samplePositionsAt picks the nearest sample within the window per player", () => {
  const samples = [
    makeSample({ match_time: 80, x: 1 }), // outside 10s window of t=100
    makeSample({ match_time: 92, x: 2 }),
    makeSample({ match_time: 97, x: 3 }), // nearest to t=100
    makeSample({ match_time: 101, x: 4 }), // after t, ignored
  ].sort((a, b) => a.match_time - b.match_time);

  const result = samplePositionsAt(100, samples);
  expect(result.get("teammate::Team 1")?.x).toBe(3);
});

test("isolation death percentage classifies by nearest teammate distance", () => {
  // 3 deaths with a teammate 10m away (peeled), 3 with the teammate 20m away (isolated) → 50%
  const deaths = Array.from({ length: 6 }, (_, i) =>
    makeKill({
      match_time: 100 + i * 60,
      attacker_name: "enemy",
      victim_name: "lux",
      victim_team: "Team 1",
      victim_x: 0,
      victim_y: 0,
      victim_z: 0,
    })
  );
  const samples = deaths
    .map((d, i) =>
      makeSample({
        match_time: d.match_time - 2,
        playerName: "teammate",
        playerTeam: "Team 1",
        x: i < 3 ? 10 : 20,
      })
    )
    .sort((a, b) => a.match_time - b.match_time);

  expect(computeIsolationDeathPercentage(deaths, samples, "lux")).toBe(50);
});

test("deaths with no sampled teammate are excluded from the denominator", () => {
  // 5 evaluable deaths (isolated) + 1 with no teammate sample → 100% over 5
  const deaths = Array.from({ length: 6 }, (_, i) =>
    makeKill({
      match_time: 100 + i * 60,
      attacker_name: "enemy",
      victim_name: "lux",
      victim_team: "Team 1",
      victim_x: 0,
      victim_y: 0,
      victim_z: 0,
    })
  );
  const samples = deaths
    .slice(0, 5)
    .map((d) =>
      makeSample({ match_time: d.match_time - 1, x: 30 })
    )
    .sort((a, b) => a.match_time - b.match_time);

  expect(computeIsolationDeathPercentage(deaths, samples, "lux")).toBe(100);
});

test("isolation death percentage is null without victim coordinates", () => {
  const deaths = Array.from({ length: 6 }, () =>
    makeKill({
      attacker_name: "enemy",
      victim_name: "lux",
      victim_team: "Team 1",
      victim_x: null,
      victim_y: null,
      victim_z: null,
    })
  );
  const samples = [makeSample()];
  expect(computeIsolationDeathPercentage(deaths, samples, "lux")).toBeNull();
});

test("fight start spread averages distance to teammates across fights", () => {
  // 5 fights; player at origin, teammates at 10m and 20m → mean 15 per fight
  const fightStarts = [100, 200, 300, 400, 500];
  const samples = fightStarts
    .flatMap((start) => [
      makeSample({ match_time: start - 3, playerName: "lux", x: 0 }),
      makeSample({ match_time: start - 2, playerName: "mate1", x: 10 }),
      makeSample({ match_time: start - 1, playerName: "mate2", x: 20 }),
    ])
    .sort((a, b) => a.match_time - b.match_time);

  expect(computeAverageFightStartSpread(fightStarts, samples, "lux")).toBe(15);
});

test("fight start spread is null when the player is never sampled", () => {
  const fightStarts = [100, 200, 300, 400, 500];
  const samples = fightStarts
    .flatMap((start) => [
      makeSample({ match_time: start - 2, playerName: "mate1", x: 10 }),
      makeSample({ match_time: start - 1, playerName: "mate2", x: 20 }),
    ])
    .sort((a, b) => a.match_time - b.match_time);

  expect(computeAverageFightStartSpread(fightStarts, samples, "lux")).toBeNull();
});

test("a teammate at exactly the isolation radius is not isolated", () => {
  // 6 deaths, teammate exactly 15m away each time → strict > means 0% isolated
  const deaths = Array.from({ length: 6 }, (_, i) =>
    makeKill({
      match_time: 100 + i * 60,
      attacker_name: "enemy",
      victim_name: "lux",
      victim_team: "Team 1",
      victim_x: 0,
      victim_y: 0,
      victim_z: 0,
    })
  );
  const samples = deaths
    .map((d) => makeSample({ match_time: d.match_time - 1, x: ISOLATION_RADIUS }))
    .sort((a, b) => a.match_time - b.match_time);

  expect(computeIsolationDeathPercentage(deaths, samples, "lux")).toBe(0);
});
