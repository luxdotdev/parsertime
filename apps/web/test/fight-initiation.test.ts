import { describe, expect, test } from "vitest";
import type { Kill } from "@/generated/prisma/client";
import {
  MIN_COMMIT_PLAYERS,
  determineFightWinner,
  findTeamCommit,
  healingSignal,
  detectFightInitiation,
  assembleMapInitiation,
  buildRoundBoundaryMarkers,
  type DamageEvent,
  type UltEvent,
  type HealEvent,
  type InitiationContext,
  type RoundEventInput,
} from "@/lib/fight-initiation";
import type { Fight } from "@/lib/utils";

function makeKill(overrides: Partial<Kill> = {}): Kill {
  return {
    id: 0,
    scrimId: 0,
    event_type: "kill",
    match_time: 100,
    attacker_team: "Team 1",
    attacker_name: "a",
    attacker_hero: "Reinhardt",
    victim_team: "Team 2",
    victim_name: "b",
    victim_hero: "Ana",
    event_ability: "Primary Fire",
    event_damage: 100,
    is_critical_hit: "0",
    is_environmental: "0",
    attacker_x: null,
    attacker_y: null,
    attacker_z: null,
    victim_x: null,
    victim_y: null,
    victim_z: null,
    MapDataId: 1,
    ...overrides,
  } as Kill;
}

describe("determineFightWinner", () => {
  test("the team with more kills wins", () => {
    const kills = [
      makeKill({
        match_time: 100,
        attacker_team: "Team 1",
        victim_team: "Team 2",
      }),
      makeKill({
        match_time: 101,
        attacker_team: "Team 1",
        victim_team: "Team 2",
      }),
      makeKill({
        match_time: 102,
        attacker_team: "Team 2",
        victim_team: "Team 1",
      }),
    ];
    expect(determineFightWinner(kills, "Team 1", "Team 2")).toBe("Team 1");
  });

  test("a mercy rez cancels the opposing kill", () => {
    const kills = [
      makeKill({
        match_time: 100,
        attacker_team: "Team 1",
        victim_team: "Team 2",
      }),
      makeKill({
        match_time: 101,
        attacker_team: "Team 2",
        victim_team: "Team 1",
      }),
      // Team 1 rezzes their dead player → undoes Team 2's kill
      makeKill({
        match_time: 102,
        event_type: "mercy_rez",
        attacker_team: "Team 1",
        victim_team: "Team 1",
      }),
    ];
    expect(determineFightWinner(kills, "Team 1", "Team 2")).toBe("Team 1");
  });

  test("equal kills is a draw", () => {
    const kills = [
      makeKill({
        match_time: 100,
        attacker_team: "Team 1",
        victim_team: "Team 2",
      }),
      makeKill({
        match_time: 101,
        attacker_team: "Team 2",
        victim_team: "Team 1",
      }),
    ];
    expect(determineFightWinner(kills, "Team 1", "Team 2")).toBeNull();
  });
});

describe("constants", () => {
  test("MIN_COMMIT_PLAYERS default is 2", () => {
    expect(MIN_COMMIT_PLAYERS).toBe(2);
  });
});

function dmg(overrides: Partial<DamageEvent> = {}): DamageEvent {
  return {
    match_time: 100,
    attacker_name: "a",
    attacker_team: "Team 1",
    victim_name: "x",
    victim_team: "Team 2",
    event_damage: 50,
    ...overrides,
  };
}

function emptyCtx(over: Partial<InitiationContext> = {}): InitiationContext {
  return {
    teams: ["Team 1", "Team 2"],
    damage: [],
    ability1: [],
    ability2: [],
    ults: [],
    healing: [],
    ...over,
  };
}

describe("findTeamCommit", () => {
  test("two players landing heavy damage = a commit (dive engage)", () => {
    const damage: DamageEvent[] = [
      dmg({ match_time: 100, attacker_name: "ball", event_damage: 150 }),
      dmg({ match_time: 100.5, attacker_name: "tracer", event_damage: 150 }),
    ];
    const commit = findTeamCommit("Team 1", 95, 102, emptyCtx({ damage }));
    expect(commit).not.toBeNull();
    expect(commit!.players.sort()).toEqual(["ball", "tracer"]);
    expect(commit!.time).toBe(100);
  });

  test("a lone heavy spike (one Widow headshot) is NOT a commit", () => {
    const damage: DamageEvent[] = [
      dmg({ match_time: 100, attacker_name: "widow", event_damage: 300 }),
    ];
    expect(findTeamCommit("Team 1", 95, 102, emptyCtx({ damage }))).toBeNull();
  });

  test("two players merely poking (low volume) is NOT a commit", () => {
    const damage: DamageEvent[] = [
      dmg({ match_time: 100, attacker_name: "ashe", event_damage: 40 }),
      dmg({ match_time: 100.4, attacker_name: "widow", event_damage: 40 }),
    ];
    expect(findTeamCommit("Team 1", 95, 102, emptyCtx({ damage }))).toBeNull();
  });

  test("an offensive ult alone is a hard commit", () => {
    const ults: UltEvent[] = [
      { match_time: 100, player_name: "rein", player_team: "Team 1" },
    ];
    const commit = findTeamCommit("Team 1", 95, 102, emptyCtx({ ults }));
    expect(commit).not.toBeNull();
    expect(commit!.usedUlt).toBe(true);
  });

  test("self-damage and enemy damage do not count toward a team's commit", () => {
    const damage: DamageEvent[] = [
      // self-damage (same team both sides)
      dmg({
        match_time: 100,
        attacker_name: "zarya",
        attacker_team: "Team 1",
        victim_team: "Team 1",
        event_damage: 200,
      }),
      // the enemy team dealing damage
      dmg({
        match_time: 100.2,
        attacker_name: "enemy",
        attacker_team: "Team 2",
        victim_team: "Team 1",
        event_damage: 200,
      }),
    ];
    expect(findTeamCommit("Team 1", 95, 102, emptyCtx({ damage }))).toBeNull();
  });

  test("only events inside the window are considered", () => {
    const damage: DamageEvent[] = [
      dmg({ match_time: 90, attacker_name: "ball", event_damage: 200 }),
      dmg({ match_time: 90.3, attacker_name: "tracer", event_damage: 200 }),
    ];
    expect(findTeamCommit("Team 1", 95, 102, emptyCtx({ damage }))).toBeNull();
  });
});

describe("healingSignal", () => {
  test("corroborates when the engaged-on (non-initiator) team heals more", () => {
    const healing: HealEvent[] = [
      { match_time: 100.5, healee_team: "Team 2", event_healing: 200 },
      { match_time: 101, healee_team: "Team 1", event_healing: 20 },
    ];
    // Team 1 initiated at t=100; Team 2 is the one being engaged on.
    expect(healingSignal("Team 1", "Team 2", 100, healing)).toBe(
      "corroborates"
    );
  });

  test("contradicts when the initiator's own team heals much more", () => {
    const healing: HealEvent[] = [
      { match_time: 100.5, healee_team: "Team 1", event_healing: 300 },
      { match_time: 101, healee_team: "Team 2", event_healing: 20 },
    ];
    expect(healingSignal("Team 1", "Team 2", 100, healing)).toBe("contradicts");
  });

  test("neutral when healing is comparable", () => {
    const healing: HealEvent[] = [
      { match_time: 100.5, healee_team: "Team 1", event_healing: 100 },
      { match_time: 101, healee_team: "Team 2", event_healing: 100 },
    ];
    expect(healingSignal("Team 1", "Team 2", 100, healing)).toBe("neutral");
  });

  test("ignores healing outside the corroboration window", () => {
    const healing: HealEvent[] = [
      { match_time: 200, healee_team: "Team 2", event_healing: 500 },
    ];
    expect(healingSignal("Team 1", "Team 2", 100, healing)).toBe("neutral");
  });
});

function fightFrom(kills: Kill[]): Fight {
  const sorted = [...kills].sort((a, b) => a.match_time - b.match_time);
  return {
    kills: sorted,
    start: sorted[0]!.match_time,
    end: sorted[sorted.length - 1]!.match_time,
  };
}

describe("detectFightInitiation", () => {
  test("labels the team that commits first as the initiator, with the win read", () => {
    // Fight first kill at t=110. Team 1 commits a dive at ~104; Team 2 responds at ~108.
    const fight = fightFrom([
      makeKill({
        match_time: 110,
        attacker_team: "Team 1",
        victim_team: "Team 2",
      }),
      makeKill({
        match_time: 112,
        attacker_team: "Team 1",
        victim_team: "Team 2",
      }),
    ]);
    const damage: DamageEvent[] = [
      dmg({
        match_time: 104,
        attacker_name: "ball",
        attacker_team: "Team 1",
        event_damage: 150,
      }),
      dmg({
        match_time: 104.4,
        attacker_name: "tracer",
        attacker_team: "Team 1",
        event_damage: 150,
      }),
      dmg({
        match_time: 108,
        attacker_name: "e1",
        attacker_team: "Team 2",
        victim_team: "Team 1",
        event_damage: 150,
      }),
      dmg({
        match_time: 108.4,
        attacker_name: "e2",
        attacker_team: "Team 2",
        victim_team: "Team 1",
        event_damage: 150,
      }),
    ];
    const label = detectFightInitiation(
      fight,
      0,
      -Infinity,
      emptyCtx({ damage })
    );
    expect(label.initiator).toBe("Team 1");
    expect(label.contested).toBe(false);
    expect(label.winner).toBe("Team 1");
    expect(label.initiatorWon).toBe(true);
    expect(label.confidence).toBe("medium"); // 4s gap → clean separation, but 2-player burst with no ult/3rd attacker/heal corroboration is not corroborated → medium
  });

  test("simultaneous commits within tolerance are contested", () => {
    const fight = fightFrom([
      makeKill({
        match_time: 110,
        attacker_team: "Team 1",
        victim_team: "Team 2",
      }),
    ]);
    const damage: DamageEvent[] = [
      dmg({
        match_time: 104,
        attacker_name: "ball",
        attacker_team: "Team 1",
        event_damage: 150,
      }),
      dmg({
        match_time: 104.1,
        attacker_name: "tracer",
        attacker_team: "Team 1",
        event_damage: 150,
      }),
      dmg({
        match_time: 104.2,
        attacker_name: "e1",
        attacker_team: "Team 2",
        victim_team: "Team 1",
        event_damage: 150,
      }),
      dmg({
        match_time: 104.3,
        attacker_name: "e2",
        attacker_team: "Team 2",
        victim_team: "Team 1",
        event_damage: 150,
      }),
    ];
    const label = detectFightInitiation(
      fight,
      0,
      -Infinity,
      emptyCtx({ damage })
    );
    expect(label.contested).toBe(true);
    expect(label.initiator).toBeNull();
    expect(label.confidence).toBe("low");
  });

  test("with no detectable commitment, falls back to first blood at low confidence", () => {
    const fight = fightFrom([
      makeKill({
        match_time: 110,
        attacker_team: "Team 2",
        victim_team: "Team 1",
      }),
    ]);
    const label = detectFightInitiation(fight, 0, -Infinity, emptyCtx());
    expect(label.initiator).toBe("Team 2");
    expect(label.evidence.fallback).toBe(true);
    expect(label.confidence).toBe("low");
    expect(label.evidence.firstBloodTeam).toBe("Team 2");
  });

  test("records the 'went first, lost the opener' case", () => {
    // Team 1 commits first but Team 2 gets first blood and wins.
    const fight = fightFrom([
      makeKill({
        match_time: 110,
        attacker_team: "Team 2",
        victim_team: "Team 1",
      }),
      makeKill({
        match_time: 111,
        attacker_team: "Team 2",
        victim_team: "Team 1",
      }),
    ]);
    const damage: DamageEvent[] = [
      dmg({
        match_time: 104,
        attacker_name: "ball",
        attacker_team: "Team 1",
        event_damage: 150,
      }),
      dmg({
        match_time: 104.4,
        attacker_name: "tracer",
        attacker_team: "Team 1",
        event_damage: 150,
      }),
    ];
    const label = detectFightInitiation(
      fight,
      0,
      -Infinity,
      emptyCtx({ damage })
    );
    expect(label.initiator).toBe("Team 1");
    expect(label.firstBloodTeam ?? label.evidence.firstBloodTeam).toBe(
      "Team 2"
    );
    expect(label.winner).toBe("Team 2");
    expect(label.initiatorWon).toBe(false);
  });

  test("the lookback never reaches into the previous fight", () => {
    const fight = fightFrom([
      makeKill({
        match_time: 110,
        attacker_team: "Team 1",
        victim_team: "Team 2",
      }),
    ]);
    // A burst at t=100 would normally be inside the 12s lookback, but prevFightEnd=106.
    const damage: DamageEvent[] = [
      dmg({
        match_time: 100,
        attacker_name: "ball",
        attacker_team: "Team 1",
        event_damage: 200,
      }),
      dmg({
        match_time: 100.3,
        attacker_name: "tracer",
        attacker_team: "Team 1",
        event_damage: 200,
      }),
    ];
    const label = detectFightInitiation(fight, 1, 106, emptyCtx({ damage }));
    expect(label.evidence.fallback).toBe(true); // no commit found inside [106, 110]
  });
});

describe("assembleMapInitiation", () => {
  test("returns unavailable when there is no granular damage data", () => {
    const kills = [
      makeKill({
        match_time: 110,
        attacker_team: "Team 1",
        victim_team: "Team 2",
      }),
    ];
    const result = assembleMapInitiation({
      kills,
      rezzes: [],
      damage: [],
      ability1: [],
      ability2: [],
      ults: [],
      healing: [],
      roundStarts: [],
      roundEnds: [],
    });
    expect(result.available).toBe(false);
    expect(result.labels).toEqual([]);
    expect(result.summary).toBeNull();
    expect(result.rounds).toEqual([]);
  });

  test("labels fights and summarizes per-team go-first winrate", () => {
    // Two separate fights (>15s apart). Team 1 dives first in both; wins one, loses one.
    const kills = [
      makeKill({
        match_time: 110,
        attacker_team: "Team 1",
        victim_team: "Team 2",
      }),
      makeKill({
        match_time: 111,
        attacker_team: "Team 1",
        victim_team: "Team 2",
      }),
      makeKill({
        match_time: 200,
        attacker_team: "Team 2",
        victim_team: "Team 1",
      }),
      makeKill({
        match_time: 201,
        attacker_team: "Team 2",
        victim_team: "Team 1",
      }),
    ];
    const damage: DamageEvent[] = [
      dmg({
        match_time: 105,
        attacker_name: "ball",
        attacker_team: "Team 1",
        event_damage: 150,
      }),
      dmg({
        match_time: 105.4,
        attacker_name: "tracer",
        attacker_team: "Team 1",
        event_damage: 150,
      }),
      dmg({
        match_time: 195,
        attacker_name: "ball",
        attacker_team: "Team 1",
        event_damage: 150,
      }),
      dmg({
        match_time: 195.4,
        attacker_name: "tracer",
        attacker_team: "Team 1",
        event_damage: 150,
      }),
    ];
    const result = assembleMapInitiation({
      kills,
      rezzes: [],
      damage,
      ability1: [],
      ability2: [],
      ults: [],
      healing: [],
      roundStarts: [],
      roundEnds: [],
    });
    expect(result.available).toBe(true);
    expect(result.labels).toHaveLength(2);
    expect(result.summary!.byTeam["Team 1"]!.initiations).toBe(2);
    expect(result.summary!.byTeam["Team 1"]!.initiationWins).toBe(1);
    expect(result.summary!.byTeam["Team 1"]!.initiationWinrate).toBe(50);
  });

  test("rounds are collapsed and sorted ascending by match_time in an available result", () => {
    const kills = [
      makeKill({
        match_time: 110,
        attacker_team: "Team 1",
        victim_team: "Team 2",
      }),
      makeKill({
        match_time: 111,
        attacker_team: "Team 1",
        victim_team: "Team 2",
      }),
    ];
    const damage: DamageEvent[] = [
      dmg({
        match_time: 105,
        attacker_name: "ball",
        attacker_team: "Team 1",
        event_damage: 150,
      }),
      dmg({
        match_time: 105.4,
        attacker_name: "tracer",
        attacker_team: "Team 1",
        event_damage: 150,
      }),
    ];
    // R1 start at t=90, R2 start at t=115, R1 end at t=130 (only end row)
    const result = assembleMapInitiation({
      kills,
      rezzes: [],
      damage,
      ability1: [],
      ability2: [],
      ults: [],
      healing: [],
      roundStarts: [
        { match_time: 90, round_number: 1 },
        { match_time: 115, round_number: 2 },
      ],
      roundEnds: [{ match_time: 130, round_number: 1 }],
    });
    expect(result.available).toBe(true);
    // first(R1 t=90), change(R2←R1 t=115), last(R1 t=130)
    expect(result.rounds).toHaveLength(3);
    expect(result.rounds.map((r) => r.match_time)).toEqual([90, 115, 130]);
    expect(result.rounds[0]!.kind).toBe("first");
    expect(result.rounds[1]!.kind).toBe("change");
    expect(result.rounds[1]!.previous_round).toBe(1);
    expect(result.rounds[2]!.kind).toBe("last");
  });

  test("unavailable result (empty damage) always returns rounds: []", () => {
    const kills = [
      makeKill({
        match_time: 110,
        attacker_team: "Team 1",
        victim_team: "Team 2",
      }),
    ];
    const result = assembleMapInitiation({
      kills,
      rezzes: [],
      damage: [],
      ability1: [],
      ability2: [],
      ults: [],
      healing: [],
      roundStarts: [{ match_time: 115, round_number: 1 }],
      roundEnds: [],
    });
    expect(result.available).toBe(false);
    expect(result.rounds).toEqual([]);
  });

  test("sort does not mutate the caller's roundStarts/roundEnds arrays", () => {
    const kills = [
      makeKill({
        match_time: 110,
        attacker_team: "Team 1",
        victim_team: "Team 2",
      }),
      makeKill({
        match_time: 111,
        attacker_team: "Team 1",
        victim_team: "Team 2",
      }),
    ];
    const damage: DamageEvent[] = [
      dmg({
        match_time: 105,
        attacker_name: "ball",
        attacker_team: "Team 1",
        event_damage: 150,
      }),
      dmg({
        match_time: 105.4,
        attacker_name: "tracer",
        attacker_team: "Team 1",
        event_damage: 150,
      }),
    ];
    const inputStarts: RoundEventInput[] = [
      { match_time: 150, round_number: 2 },
      { match_time: 50, round_number: 1 },
    ];
    const inputEnds: RoundEventInput[] = [
      { match_time: 200, round_number: 2 },
      { match_time: 140, round_number: 1 },
    ];
    const originalStartOrder = inputStarts.map((r) => r.match_time);
    const originalEndOrder = inputEnds.map((r) => r.match_time);
    assembleMapInitiation({
      kills,
      rezzes: [],
      damage,
      ability1: [],
      ability2: [],
      ults: [],
      healing: [],
      roundStarts: inputStarts,
      roundEnds: inputEnds,
    });
    // The original arrays must be unchanged
    expect(inputStarts.map((r) => r.match_time)).toEqual(originalStartOrder);
    expect(inputEnds.map((r) => r.match_time)).toEqual(originalEndOrder);
  });
});

describe("buildRoundBoundaryMarkers", () => {
  test("three rounds produce first, two changes, and last with correct round_number/previous_round", () => {
    const starts: RoundEventInput[] = [
      { match_time: 10, round_number: 1 },
      { match_time: 50, round_number: 2 },
      { match_time: 90, round_number: 3 },
    ];
    const ends: RoundEventInput[] = [
      { match_time: 48, round_number: 1 },
      { match_time: 88, round_number: 2 },
      { match_time: 130, round_number: 3 },
    ];
    const markers = buildRoundBoundaryMarkers(starts, ends);
    // first(R1), change(R2←R1), change(R3←R2), last(R3)
    expect(markers).toHaveLength(4);
    expect(markers[0]!.kind).toBe("first");
    expect(markers[0]!.round_number).toBe(1);
    expect(markers[0]!.previous_round).toBeNull();
    expect(markers[1]!.kind).toBe("change");
    expect(markers[1]!.round_number).toBe(2);
    expect(markers[1]!.previous_round).toBe(1);
    expect(markers[2]!.kind).toBe("change");
    expect(markers[2]!.round_number).toBe(3);
    expect(markers[2]!.previous_round).toBe(2);
    expect(markers[3]!.kind).toBe("last");
    expect(markers[3]!.round_number).toBe(3);
    expect(markers[3]!.previous_round).toBeNull();
    // Intermediate ends (R1 end at t=48, R2 end at t=88) are dropped
    expect(markers.every((m) => m.match_time !== 48)).toBe(true);
    expect(markers.every((m) => m.match_time !== 88)).toBe(true);
  });

  test("a single round produces first and last only (no change)", () => {
    const starts: RoundEventInput[] = [{ match_time: 10, round_number: 1 }];
    const ends: RoundEventInput[] = [{ match_time: 60, round_number: 1 }];
    const markers = buildRoundBoundaryMarkers(starts, ends);
    expect(markers).toHaveLength(2);
    expect(markers[0]!.kind).toBe("first");
    expect(markers[1]!.kind).toBe("last");
    expect(markers.some((m) => m.kind === "change")).toBe(false);
  });

  test("empty inputs produce an empty array", () => {
    expect(buildRoundBoundaryMarkers([], [])).toEqual([]);
  });

  test("only starts with no ends produces only first/change markers (no last)", () => {
    const starts: RoundEventInput[] = [
      { match_time: 10, round_number: 1 },
      { match_time: 50, round_number: 2 },
    ];
    const markers = buildRoundBoundaryMarkers(starts, []);
    expect(markers).toHaveLength(2);
    expect(markers[0]!.kind).toBe("first");
    expect(markers[1]!.kind).toBe("change");
    expect(markers.some((m) => m.kind === "last")).toBe(false);
  });

  test("duplicate RoundStart rows for the same round_number collapse to one", () => {
    const starts: RoundEventInput[] = [
      { match_time: 15, round_number: 1 },
      { match_time: 10, round_number: 1 }, // earlier — should win
      { match_time: 50, round_number: 2 },
    ];
    const ends: RoundEventInput[] = [{ match_time: 80, round_number: 2 }];
    const markers = buildRoundBoundaryMarkers(starts, ends);
    // first(R1 t=10), change(R2←R1 t=50), last(R2 t=80)
    expect(markers).toHaveLength(3);
    expect(markers[0]!.kind).toBe("first");
    expect(markers[0]!.match_time).toBe(10);
    expect(markers[1]!.kind).toBe("change");
    expect(markers[2]!.kind).toBe("last");
  });

  test("markers are sorted ascending by match_time", () => {
    const starts: RoundEventInput[] = [
      { match_time: 50, round_number: 2 },
      { match_time: 10, round_number: 1 },
    ];
    const ends: RoundEventInput[] = [{ match_time: 80, round_number: 2 }];
    const markers = buildRoundBoundaryMarkers(starts, ends);
    const times = markers.map((m) => m.match_time);
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  test("inputs are not mutated", () => {
    const starts: RoundEventInput[] = [
      { match_time: 50, round_number: 2 },
      { match_time: 10, round_number: 1 },
    ];
    const ends: RoundEventInput[] = [
      { match_time: 80, round_number: 2 },
      { match_time: 45, round_number: 1 },
    ];
    const startsCopy = starts.map((s) => ({ ...s }));
    const endsCopy = ends.map((e) => ({ ...e }));
    buildRoundBoundaryMarkers(starts, ends);
    expect(starts).toEqual(startsCopy);
    expect(ends).toEqual(endsCopy);
  });
});
