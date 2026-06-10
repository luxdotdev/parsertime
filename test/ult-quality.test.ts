import {
  buildUltInstances,
  computeUltQualityStats,
  MAX_ULT_DURATION_SEC,
  pairUltEvents,
  type UltEndEvent,
  type UltKill,
  type UltStartEvent,
} from "@/lib/ult-quality";
import { expect, test } from "vitest";

function start(o: Partial<UltStartEvent> = {}): UltStartEvent {
  return {
    match_time: 100,
    player_name: "lux",
    player_team: "Team 1",
    player_hero: "Genji",
    ultimate_id: 1,
    player_x: 0,
    player_y: 0,
    player_z: 0,
    ...o,
  };
}
function end(o: Partial<UltEndEvent> = {}): UltEndEvent {
  return {
    match_time: 106,
    player_name: "lux",
    player_team: "Team 1",
    player_hero: "Genji",
    ultimate_id: 1,
    player_x: 12,
    player_y: 0,
    player_z: 5,
    ...o,
  };
}
function kill(o: Partial<UltKill> = {}): UltKill {
  return {
    match_time: 102,
    attacker_name: "lux",
    attacker_team: "Team 1",
    victim_name: "enemy",
    victim_team: "Team 2",
    attacker_x: 3,
    attacker_y: 0,
    attacker_z: 0,
    victim_x: 4,
    victim_y: 0,
    victim_z: 0,
    ...o,
  };
}

test("pairUltEvents matches start and end by player and ultimate_id", () => {
  const pairs = pairUltEvents([start()], [end()]);
  expect(pairs).toHaveLength(1);
  expect(pairs[0].unpaired).toBe(false);
  expect(pairs[0].endTime).toBe(106);
});

test("a missing end is capped at MAX_ULT_DURATION_SEC and flagged", () => {
  const pairs = pairUltEvents([start()], []);
  expect(pairs[0].unpaired).toBe(true);
  expect(pairs[0].endTime).toBe(100 + MAX_ULT_DURATION_SEC);
});

test("interleaved ultimate_ids pair correctly per player", () => {
  const starts = [
    start({ ultimate_id: 1, match_time: 100 }),
    start({ ultimate_id: 2, match_time: 200 }),
    start({ player_name: "other", ultimate_id: 1, match_time: 110 }),
  ];
  const ends = [
    end({ ultimate_id: 2, match_time: 207 }),
    end({ ultimate_id: 1, match_time: 105 }),
    end({ player_name: "other", ultimate_id: 1, match_time: 118 }),
  ];
  const pairs = pairUltEvents(starts, ends);
  const lux1 = pairs.find((p) => p.playerName === "lux" && p.ultimateId === 1)!;
  const lux2 = pairs.find((p) => p.playerName === "lux" && p.ultimateId === 2)!;
  const other = pairs.find((p) => p.playerName === "other")!;
  expect(lux1.endTime).toBe(105);
  expect(lux2.endTime).toBe(207);
  expect(other.endTime).toBe(118);
});

test("an end before its start is ignored (capped instead)", () => {
  const pairs = pairUltEvents(
    [start({ match_time: 100 })],
    [end({ match_time: 90 })]
  );
  expect(pairs[0].unpaired).toBe(true);
});

test("buildUltInstances computes conversion kills within radius and window", () => {
  const instances = buildUltInstances(
    pairUltEvents([start()], [end()]),
    [
      kill({ match_time: 102, attacker_x: 3 }),
      kill({ match_time: 102, attacker_x: 50 }),
      kill({ match_time: 120, attacker_x: 3 }),
      kill({ match_time: 103, attacker_team: "Team 2", attacker_x: 3 }),
    ],
    () => []
  );
  expect(instances[0].conversionKills).toBe(1);
});

test("conversion falls back to victim position when attacker coords missing", () => {
  const instances = buildUltInstances(
    pairUltEvents([start()], [end()]),
    [kill({ match_time: 102, attacker_x: null, victim_x: 4 })],
    () => []
  );
  expect(instances[0].conversionKills).toBe(1);
});

test("died-during-ult and displacement", () => {
  const instances = buildUltInstances(
    pairUltEvents([start()], [end()]),
    [
      kill({
        match_time: 103,
        attacker_name: "enemy2",
        attacker_team: "Team 2",
        victim_name: "lux",
        victim_team: "Team 1",
      }),
    ],
    () => []
  );
  expect(instances[0].diedDuringUlt).toBe(true);
  expect(instances[0].displacement).toBe(13);
});

test("conversion and displacement are null without start coordinates", () => {
  const instances = buildUltInstances(
    pairUltEvents([start({ player_x: null, player_z: null })], [end()]),
    [kill()],
    () => []
  );
  expect(instances[0].conversionKills).toBeNull();
  expect(instances[0].displacement).toBeNull();
  expect(instances[0].diedDuringUlt).toBe(false);
});

test("zone tagging uses the resolver at ult start time", () => {
  const zones = [
    {
      id: 1,
      name: "Point",
      category: "POINT" as const,
      vertices: [[-5, -5], [5, -5], [5, 5], [-5, 5]] as Array<[number, number]>,
    },
  ];
  const instances = buildUltInstances(
    pairUltEvents([start()], [end()]),
    [],
    () => zones
  );
  expect(instances[0].zone?.name).toBe("Point");
  expect(instances[0].zone?.category).toBe("POINT");
});

function instances(n: number, overrides: object = {}) {
  return Array.from({ length: n }, (_, i) => ({
    playerName: "lux",
    playerTeam: "Team 1",
    hero: "Genji",
    startTime: 100 + i * 60,
    endTime: 106 + i * 60,
    unpaired: false,
    x: 0,
    z: 0,
    displacement: 10,
    conversionKills: 2,
    diedDuringUlt: i === 0,
    zone: { name: "Point", category: "POINT" as const },
    ...overrides,
  }));
}

test("aggregates over the player's ults", () => {
  const stats = computeUltQualityStats(instances(4), "lux", true);
  expect(stats.averageUltConversionKills).toBe(2);
  expect(stats.ultDeathPercentage).toBe(25);
  expect(stats.averageUltDisplacement).toBe(10);
  expect(stats.ultsOnObjectivePercentage).toBe(100);
});

test("all null below MIN_ULTS_FOR_STATS", () => {
  const stats = computeUltQualityStats(instances(2), "lux", true);
  expect(stats.averageUltConversionKills).toBeNull();
  expect(stats.ultDeathPercentage).toBeNull();
  expect(stats.averageUltDisplacement).toBeNull();
  expect(stats.ultsOnObjectivePercentage).toBeNull();
});

test("coordinate-dependent stats are null when instances lack coords; death % survives", () => {
  const stats = computeUltQualityStats(
    instances(4, { x: null, z: null, displacement: null, conversionKills: null, zone: null }),
    "lux",
    true
  );
  expect(stats.averageUltConversionKills).toBeNull();
  expect(stats.averageUltDisplacement).toBeNull();
  expect(stats.ultsOnObjectivePercentage).toBeNull();
  expect(stats.ultDeathPercentage).toBe(25);
});

test("ults-on-objective is null when the map has no published POINT zones", () => {
  const stats = computeUltQualityStats(instances(4), "lux", false);
  expect(stats.ultsOnObjectivePercentage).toBeNull();
  expect(stats.averageUltConversionKills).toBe(2);
});

test("only the named player's ults count", () => {
  const mine = instances(4);
  const theirs = instances(4, { playerName: "other", conversionKills: 9 });
  const stats = computeUltQualityStats([...mine, ...theirs], "lux", true);
  expect(stats.averageUltConversionKills).toBe(2);
});
