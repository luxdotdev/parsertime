import {
  countCrossTeamDamage,
  detectRotationDeaths,
  summarizeByPlayer,
  type DamageEvent,
} from "@/lib/replay/rotation-death-detection";
import type { Fight } from "@/lib/utils";
import type { Kill } from "@prisma/client";
import { describe, expect, test } from "vitest";

function makeKill(overrides: Partial<Kill> = {}): Kill {
  return {
    id: 1,
    scrimId: 1,
    event_type: "kill",
    match_time: 100,
    attacker_team: "Team 1",
    attacker_name: "Attacker",
    attacker_hero: "Soldier: 76",
    victim_team: "Team 2",
    victim_name: "Victim",
    victim_hero: "Ana",
    event_ability: "Primary Fire",
    event_damage: 200,
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
  };
}

function makeFight(kills: Kill[]): Fight {
  return {
    kills,
    start: kills[0].match_time,
    end: kills[kills.length - 1].match_time,
  };
}

/** Creates N cross-team damage events spread across a time range */
function makeCrossTeamDamage(
  count: number,
  startTime: number,
  endTime: number
): DamageEvent[] {
  const events: DamageEvent[] = [];
  const step = count > 1 ? (endTime - startTime) / (count - 1) : 0;
  for (let i = 0; i < count; i++) {
    events.push({
      match_time: startTime + step * i,
      attacker_team: i % 2 === 0 ? "Team 1" : "Team 2",
      victim_team: i % 2 === 0 ? "Team 2" : "Team 1",
    });
  }
  return events;
}

/** Creates N same-team damage events (self-damage, not cross-team) */
function makeSelfDamage(
  count: number,
  startTime: number,
  endTime: number
): DamageEvent[] {
  const events: DamageEvent[] = [];
  const step = count > 1 ? (endTime - startTime) / (count - 1) : 0;
  for (let i = 0; i < count; i++) {
    events.push({
      match_time: startTime + step * i,
      attacker_team: "Team 1",
      victim_team: "Team 1",
    });
  }
  return events;
}

describe("countCrossTeamDamage", () => {
  test("counts cross-team events in window", () => {
    const events = makeCrossTeamDamage(10, 95, 100);
    expect(countCrossTeamDamage(events, 95, 100)).toBe(10);
  });

  test("excludes same-team damage", () => {
    const events = [
      ...makeCrossTeamDamage(3, 95, 97),
      ...makeSelfDamage(5, 95, 100),
    ].sort((a, b) => a.match_time - b.match_time);
    expect(countCrossTeamDamage(events, 95, 100)).toBe(3);
  });

  test("respects time window boundaries", () => {
    const events = makeCrossTeamDamage(20, 80, 100);
    // Only events in [95, 100] should count
    const count = countCrossTeamDamage(events, 95, 100);
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(20);
  });

  test("returns 0 for empty events", () => {
    expect(countCrossTeamDamage([], 95, 100)).toBe(0);
  });

  test("returns 0 when no events in window", () => {
    const events = makeCrossTeamDamage(10, 50, 60);
    expect(countCrossTeamDamage(events, 95, 100)).toBe(0);
  });
});

describe("detectRotationDeaths", () => {
  test("classifies first kill with low pre-fight damage as rotation death", () => {
    const kill = makeKill({ match_time: 100 });
    const fights = [makeFight([kill])];
    // Only 3 cross-team damage events in 5s before kill
    const damage = makeCrossTeamDamage(3, 95, 99);

    const results = detectRotationDeaths(fights, damage);

    expect(results).toHaveLength(1);
    expect(results[0].isRotationDeath).toBe(true);
    expect(results[0].signals.isEarlyInFight).toBe(true);
    expect(results[0].signals.lowPreFightDamage).toBe(true);
    expect(results[0].preFightDamageCount).toBe(3);
  });

  test("does not classify first kill with high pre-fight damage", () => {
    const kill = makeKill({ match_time: 100 });
    const fights = [makeFight([kill])];
    // 50 cross-team damage events = clearly engaged
    const damage = makeCrossTeamDamage(50, 95, 100);

    const results = detectRotationDeaths(fights, damage);

    expect(results[0].isRotationDeath).toBe(false);
    expect(results[0].signals.isEarlyInFight).toBe(true);
    expect(results[0].signals.lowPreFightDamage).toBe(false);
  });

  test("does not classify mid-fight kill even with low damage before it", () => {
    const kills = Array.from({ length: 5 }, (_, i) =>
      makeKill({
        id: i + 1,
        match_time: 100 + i * 2,
        victim_name: `Victim${i}`,
      })
    );
    const fights = [makeFight(kills)];
    // Lots of damage during the fight, but the 5th kill still has high damage before it
    const damage = makeCrossTeamDamage(100, 98, 108);

    const results = detectRotationDeaths(fights, damage);

    // 5th kill (index 4) fails early-fight check
    const fifthKill = results.find((r) => r.killIndexInFight === 4);
    expect(fifthKill?.isRotationDeath).toBe(false);
    expect(fifthKill?.signals.isEarlyInFight).toBe(false);
  });

  test("ignores same-team damage when counting", () => {
    const kill = makeKill({ match_time: 100 });
    const fights = [makeFight([kill])];
    // 50 same-team damage events + 2 cross-team
    const damage = [
      ...makeSelfDamage(50, 95, 100),
      ...makeCrossTeamDamage(2, 96, 98),
    ].sort((a, b) => a.match_time - b.match_time);

    const results = detectRotationDeaths(fights, damage);

    expect(results[0].isRotationDeath).toBe(true);
    expect(results[0].preFightDamageCount).toBe(2);
  });

  test("skips mercy rez events", () => {
    const rez = makeKill({
      event_type: "mercy_rez" as unknown as Kill["event_type"],
      match_time: 100,
    });
    const kill = makeKill({ id: 2, match_time: 101 });
    const fights = [makeFight([rez, kill])];
    const damage: DamageEvent[] = [];

    const results = detectRotationDeaths(fights, damage);

    expect(results).toHaveLength(1);
    expect(results[0].killIndexInFight).toBe(0);
  });

  test("skips environmental kills", () => {
    const envKill = makeKill({ is_environmental: "True", match_time: 100 });
    const fights = [makeFight([envKill])];

    const results = detectRotationDeaths(fights, []);

    expect(results).toHaveLength(0);
  });

  test("skips self-kills", () => {
    const selfKill = makeKill({
      attacker_name: "Player",
      victim_name: "Player",
      match_time: 100,
    });
    const fights = [makeFight([selfKill])];

    const results = detectRotationDeaths(fights, []);

    expect(results).toHaveLength(0);
  });

  test("computes kill distance when coordinates are available", () => {
    const kill = makeKill({
      match_time: 100,
      attacker_x: 0,
      attacker_z: 0,
      victim_x: 30,
      victim_z: 40,
    });
    const fights = [makeFight([kill])];

    const results = detectRotationDeaths(fights, []);

    expect(results[0].killDistance).toBe(50);
  });

  test("kill distance is null when coordinates are missing", () => {
    const kill = makeKill({ match_time: 100 });
    const fights = [makeFight([kill])];

    const results = detectRotationDeaths(fights, []);

    expect(results[0].killDistance).toBeNull();
  });

  test("respects custom config thresholds", () => {
    const kill = makeKill({ match_time: 100 });
    const fights = [makeFight([kill])];
    const damage = makeCrossTeamDamage(12, 95, 100);

    // Default threshold is 15, so 12 events = rotation death
    const defaultResults = detectRotationDeaths(fights, damage);
    expect(defaultResults[0].isRotationDeath).toBe(true);

    // Stricter threshold of 10 = NOT rotation death
    const strictResults = detectRotationDeaths(fights, damage, {
      damageCountThreshold: 10,
    });
    expect(strictResults[0].isRotationDeath).toBe(false);
  });

  test("handles multiple fights correctly", () => {
    const fight1Kill = makeKill({ id: 1, match_time: 100 });
    const fight2Kill = makeKill({ id: 2, match_time: 200 });
    const fights = [makeFight([fight1Kill]), makeFight([fight2Kill])];

    // Heavy damage before fight 1, no damage before fight 2
    const damage = makeCrossTeamDamage(50, 95, 100);

    const results = detectRotationDeaths(fights, damage);

    expect(results[0].isRotationDeath).toBe(false); // fight 1: lots of damage
    expect(results[1].isRotationDeath).toBe(true); // fight 2: no damage
    expect(results[1].fightIndex).toBe(1);
  });
});

describe("summarizeByPlayer", () => {
  test("aggregates rotation deaths per player", () => {
    const results = [
      {
        kill: makeKill({ victim_name: "Alice", victim_team: "Team 1" }),
        killIndexInFight: 0,
        fightIndex: 0,
        isRotationDeath: true,
        preFightDamageCount: 3,
        killDistance: null,
        signals: { isEarlyInFight: true, lowPreFightDamage: true },
      },
      {
        kill: makeKill({ id: 2, victim_name: "Alice", victim_team: "Team 1" }),
        killIndexInFight: 3,
        fightIndex: 1,
        isRotationDeath: false,
        preFightDamageCount: 40,
        killDistance: null,
        signals: { isEarlyInFight: false, lowPreFightDamage: false },
      },
      {
        kill: makeKill({ id: 3, victim_name: "Bob", victim_team: "Team 1" }),
        killIndexInFight: 0,
        fightIndex: 2,
        isRotationDeath: true,
        preFightDamageCount: 5,
        killDistance: null,
        signals: { isEarlyInFight: true, lowPreFightDamage: true },
      },
    ];

    const summaries = summarizeByPlayer(results);

    const alice = summaries.find((s) => s.playerName === "Alice");
    expect(alice).toEqual({
      playerName: "Alice",
      playerTeam: "Team 1",
      rotationDeathCount: 1,
      totalDeaths: 2,
      rotationDeathRate: 0.5,
    });

    const bob = summaries.find((s) => s.playerName === "Bob");
    expect(bob).toEqual({
      playerName: "Bob",
      playerTeam: "Team 1",
      rotationDeathCount: 1,
      totalDeaths: 1,
      rotationDeathRate: 1,
    });
  });
});
