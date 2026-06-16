import { processUltCombos } from "@/data/team/ult-combos";
import type { ExtendedTeamData } from "@/data/team/shared-core";
import type { Kill, MercyRez, UltimateStart } from "@/generated/prisma/client";
import { describe, expect, it } from "vitest";

const MAP = 1;
const OURS = "Blue";
const ENEMY = "Red";

function playerStat(name: string, team: string) {
  return {
    player_name: name,
    player_team: team,
    player_hero: "Ana",
    hero_time_played: 600,
    MapDataId: MAP,
    eliminations: 0,
    final_blows: 0,
    deaths: 0,
    offensive_assists: 0,
    hero_damage_dealt: 0,
    damage_taken: 0,
    healing_dealt: 0,
    ultimates_earned: 0,
    ultimates_used: 0,
    healing_received: 0,
    self_healing: 0,
    damage_blocked: 0,
    solo_kills: 0,
    environmental_kills: 0,
  };
}

function kill(attackerTeam: string, time: number): Kill {
  const isOurs = attackerTeam === OURS;
  return {
    match_time: time,
    attacker_team: attackerTeam,
    attacker_hero: "Soldier: 76",
    victim_team: isOurs ? ENEMY : OURS,
    MapDataId: MAP,
  } as unknown as Kill;
}

function ult(hero: string, team: string, time: number): UltimateStart {
  return {
    match_time: time,
    player_team: team,
    player_hero: hero,
    MapDataId: MAP,
  } as unknown as UltimateStart;
}

function makeData(overrides: {
  kills?: Kill[];
  ultimates?: UltimateStart[];
  rezzes?: MercyRez[];
  mapDataIds?: number[];
}): ExtendedTeamData {
  return {
    teamId: 1,
    teamRoster: ["alice", "bob", "cara"],
    teamRosterSet: new Set(["alice", "bob", "cara"]),
    mapDataRecords: [],
    mapDataIds: overrides.mapDataIds ?? [MAP],
    allPlayerStats: [
      playerStat("alice", OURS),
      playerStat("bob", OURS),
      playerStat("cara", OURS),
      playerStat("xander", ENEMY),
      playerStat("yuki", ENEMY),
    ],
    matchStarts: [],
    finalRounds: [],
    captures: [],
    payloadProgresses: [],
    pointProgresses: [],
    allKills: overrides.kills ?? [],
    allRezzes: overrides.rezzes ?? [],
    allUltimates: overrides.ultimates ?? [],
  };
}

describe("processUltCombos", () => {
  it("returns an empty analysis when there are no maps", () => {
    const result = processUltCombos(makeData({ mapDataIds: [] }));
    expect(result.combos).toEqual([]);
    expect(result.responses).toEqual([]);
    expect(result.totalMaps).toBe(0);
    expect(result.windowSeconds).toBe(10);
  });

  it("aggregates combos and responses across fights with fight-win attribution", () => {
    const kills: Kill[] = [
      // Fight A (won: 3 vs 1) around t=50
      kill(OURS, 50),
      kill(OURS, 51),
      kill(OURS, 52),
      kill(ENEMY, 53),
      // Fight B (lost: 1 vs 2) around t=80 (>15s gap from A)
      kill(ENEMY, 80),
      kill(ENEMY, 81),
      kill(OURS, 82),
      // Fight C (won: 2 vs 1) around t=120
      kill(OURS, 120),
      kill(OURS, 121),
      kill(ENEMY, 122),
    ];
    const ultimates: UltimateStart[] = [
      // Fight A: enemy Rein opens; we answer with Zarya (twice -> dedup) + Genji
      ult("Reinhardt", ENEMY, 49),
      ult("Zarya", OURS, 50),
      ult("Zarya", OURS, 51), // duplicate hero within window -> counted once
      ult("Genji", OURS, 55),
      // Fight B: our combo again, but enemy ult comes AFTER ours (not a response)
      ult("Zarya", OURS, 80),
      ult("Genji", OURS, 84),
      ult("Reinhardt", ENEMY, 88),
      // Fight C: ults 13s apart -> outside the combo window
      ult("Zarya", OURS, 120),
      ult("Ana", OURS, 133),
    ];

    const result = processUltCombos(makeData({ kills, ultimates }));

    // One combo, Genji+Zarya, in two fights (A won, B lost).
    expect(result.combos).toHaveLength(1);
    expect(result.combos[0]).toMatchObject({
      heroA: "Genji",
      heroB: "Zarya",
      count: 2,
      wins: 1,
      losses: 1,
      winrate: 50,
    });
    expect(result.totalCombos).toBe(2);

    // Responses only from Fight A (our ults after the enemy Rein, within 10s).
    expect(result.totalResponses).toBe(2);
    const byKey = Object.fromEntries(
      result.responses.map((r) => [`${r.enemyHero}|${r.ourHero}`, r])
    );
    expect(byKey["Reinhardt|Zarya"]).toMatchObject({
      count: 1,
      wins: 1,
      winrate: 100,
    });
    expect(byKey["Reinhardt|Genji"]).toMatchObject({
      count: 1,
      wins: 1,
      winrate: 100,
    });

    expect(result.enemyHeroes).toEqual(["Reinhardt"]);
    expect(result.responseHeroes.sort()).toEqual(["Genji", "Zarya"]);
    expect(result.totalMaps).toBe(1);
  });

  it("counts every distinct pair when three ults land together", () => {
    const kills: Kill[] = [kill(OURS, 10), kill(OURS, 11), kill(ENEMY, 12)];
    const ultimates: UltimateStart[] = [
      ult("Genji", OURS, 10),
      ult("Ana", OURS, 15),
      ult("Zarya", OURS, 18),
    ];

    const result = processUltCombos(makeData({ kills, ultimates }));

    const pairs = result.combos.map((c) => `${c.heroA}+${c.heroB}`).sort();
    expect(pairs).toEqual(["Ana+Genji", "Ana+Zarya", "Genji+Zarya"]);
    expect(result.combos.every((c) => c.count === 1 && c.winrate === 100)).toBe(
      true
    );
  });
});
