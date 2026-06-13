import { describe, expect, test } from "vitest";
import type { Kill } from "@/generated/prisma/client";
import {
  MIN_COMMIT_PLAYERS,
  determineFightWinner,
  findTeamCommit,
  healingSignal,
  type DamageEvent,
  type AbilityEvent,
  type UltEvent,
  type HealEvent,
  type InitiationContext,
} from "@/lib/fight-initiation";

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
      makeKill({ match_time: 100, attacker_team: "Team 1", victim_team: "Team 2" }),
      makeKill({ match_time: 101, attacker_team: "Team 1", victim_team: "Team 2" }),
      makeKill({ match_time: 102, attacker_team: "Team 2", victim_team: "Team 1" }),
    ];
    expect(determineFightWinner(kills, "Team 1", "Team 2")).toBe("Team 1");
  });

  test("a mercy rez cancels the opposing kill", () => {
    const kills = [
      makeKill({ match_time: 100, attacker_team: "Team 1", victim_team: "Team 2" }),
      makeKill({ match_time: 101, attacker_team: "Team 2", victim_team: "Team 1" }),
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
      makeKill({ match_time: 100, attacker_team: "Team 1", victim_team: "Team 2" }),
      makeKill({ match_time: 101, attacker_team: "Team 2", victim_team: "Team 1" }),
    ];
    expect(determineFightWinner(kills, "Team 1", "Team 2")).toBeNull();
  });

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
      dmg({ match_time: 100, attacker_name: "zarya", attacker_team: "Team 1", victim_team: "Team 1", event_damage: 200 }),
      // the enemy team dealing damage
      dmg({ match_time: 100.2, attacker_name: "enemy", attacker_team: "Team 2", victim_team: "Team 1", event_damage: 200 }),
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
    expect(healingSignal("Team 1", "Team 2", 100, healing)).toBe("corroborates");
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
