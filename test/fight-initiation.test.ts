import { describe, expect, test } from "vitest";
import type { Kill } from "@/generated/prisma/client";
import {
  MIN_COMMIT_PLAYERS,
  determineFightWinner,
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
