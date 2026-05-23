import type { ExtendedTeamData } from "@/data/team/shared-core";
import {
  processUltEconomy,
  type UltChargedRecord,
} from "@/data/team/ult-economy";
import type { Kill, UltimateStart } from "@prisma/client";
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
  };
}

function kill(attackerTeam: string, time: number): Kill {
  return {
    match_time: time,
    attacker_team: attackerTeam,
    attacker_hero: "Soldier: 76",
    victim_team: attackerTeam === OURS ? ENEMY : OURS,
    MapDataId: MAP,
  } as unknown as Kill;
}

function ult(player: string, team: string, time: number): UltimateStart {
  return {
    match_time: time,
    player_team: team,
    player_name: player,
    player_hero: "Ana",
    MapDataId: MAP,
  } as unknown as UltimateStart;
}

function charge(player: string, team: string, time: number): UltChargedRecord {
  return {
    player_name: player,
    player_team: team,
    match_time: time,
    MapDataId: MAP,
  };
}

function makeData(overrides: {
  kills?: Kill[];
  ultimates?: UltimateStart[];
  mapDataIds?: number[];
}): ExtendedTeamData {
  return {
    teamId: 1,
    teamRoster: ["a1", "a2", "a3"],
    teamRosterSet: new Set(["a1", "a2", "a3"]),
    mapDataRecords: [],
    mapDataIds: overrides.mapDataIds ?? [MAP],
    allPlayerStats: [
      playerStat("a1", OURS),
      playerStat("a2", OURS),
      playerStat("a3", OURS),
      playerStat("e1", ENEMY),
      playerStat("e2", ENEMY),
    ],
    matchStarts: [],
    finalRounds: [],
    captures: [],
    payloadProgresses: [],
    pointProgresses: [],
    allKills: overrides.kills ?? [],
    allRezzes: [],
    allUltimates: overrides.ultimates ?? [],
  };
}

describe("processUltEconomy", () => {
  it("returns empty analysis with no maps", () => {
    const result = processUltEconomy(makeData({ mapDataIds: [] }), []);
    expect(result.totalFights).toBe(0);
    expect(result.tempo).toEqual([]);
  });

  it("skips maps that recorded no ult charges", () => {
    const kills = [kill(OURS, 50), kill(OURS, 51), kill(ENEMY, 52)];
    const result = processUltEconomy(makeData({ kills }), []);
    expect(result.totalFights).toBe(0);
    expect(result.totalMaps).toBe(1);
  });

  it("measures ult advantage entering each fight", () => {
    const kills: Kill[] = [
      // Fight 1 (won 3-1) around t=50
      kill(OURS, 50),
      kill(OURS, 51),
      kill(OURS, 52),
      kill(ENEMY, 53),
      // Fight 2 (lost 1-2) around t=100
      kill(ENEMY, 100),
      kill(ENEMY, 101),
      kill(OURS, 102),
    ];
    const ultimates: UltimateStart[] = [
      ult("e1", ENEMY, 54),
      ult("a1", OURS, 55),
      ult("a2", OURS, 56),
    ];
    const charged: UltChargedRecord[] = [
      charge("a1", OURS, 10),
      charge("e1", ENEMY, 15),
      charge("a2", OURS, 20),
      // before fight 2: we hold 1 (a3), enemy holds 2 (e2 + recharged e1)
      charge("a3", OURS, 90),
      charge("e2", ENEMY, 92),
      charge("e1", ENEMY, 93),
    ];

    const result = processUltEconomy(makeData({ kills, ultimates }), charged);

    expect(result.totalFights).toBe(2);

    const byKey = Object.fromEntries(result.buckets.map((b) => [b.key, b]));
    // Fight 1: +2 ours (a1,a2) vs +1 enemy (e1) -> ahead 1, won.
    expect(byKey.ahead1).toMatchObject({ fights: 1, wins: 1, winrate: 100 });
    // Fight 2: 1 ours (a3) vs 2 enemy (e1,e2) -> behind 1, lost.
    expect(byKey.behind1).toMatchObject({ fights: 1, wins: 0, winrate: 0 });

    expect(result.advantagedShare).toBe(50);
    expect(result.disadvantagedShare).toBe(50);
    expect(result.winrateAhead).toBe(100);
    expect(result.winrateBehind).toBe(0);
    expect(result.avgAdvantage).toBe(0); // (+1 and -1)

    expect(result.tempo).toEqual([
      { fightNumber: 1, avgAdvantage: 1, samples: 1 },
      { fightNumber: 2, avgAdvantage: -1, samples: 1 },
    ]);
  });
});
