import {
  buildUltInstances,
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
