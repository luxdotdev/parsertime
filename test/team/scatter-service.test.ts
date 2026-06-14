import { processPlayerScatterStats } from "@/data/team/scatter-service";
import type { BaseTeamData } from "@/data/team/shared-core";
import { describe, expect, it } from "vitest";

type Row = BaseTeamData["allPlayerStats"][number];

function row(overrides: Partial<Row>): Row {
  return {
    player_name: "p",
    player_team: "TeamA",
    player_hero: "Ana",
    hero_time_played: 600,
    MapDataId: 1,
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
    ...overrides,
  };
}

function baseData(rows: Row[], roster: string[]): BaseTeamData {
  return {
    teamRosterSet: new Set(roster),
    allPlayerStats: rows,
  } as unknown as BaseTeamData;
}

describe("processPlayerScatterStats", () => {
  it("buckets stats per (player, hero) and excludes non-roster players", () => {
    const result = processPlayerScatterStats(
      baseData(
        [
          row({ player_name: "A", player_hero: "Ana", final_blows: 10 }),
          row({ player_name: "A", player_hero: "Ana", final_blows: 5 }),
          row({ player_name: "A", player_hero: "Kiriko", final_blows: 3 }),
          row({ player_name: "Opp", player_hero: "Genji", final_blows: 99 }),
        ],
        ["A"]
      )
    );

    expect(result).toHaveLength(1);
    const a = result[0];
    expect(a.playerName).toBe("A");
    const ana = a.buckets.find((b) => b.hero === "Ana")!;
    expect(ana.final_blows).toBe(15); // two Ana rows summed
    expect(ana.timePlayed).toBe(1200);
    const kiriko = a.buckets.find((b) => b.hero === "Kiriko")!;
    expect(kiriko.final_blows).toBe(3);
  });

  it("skips rows with a null MapDataId", () => {
    const result = processPlayerScatterStats(
      baseData([row({ player_name: "A", MapDataId: null, final_blows: 7 })], ["A"])
    );
    expect(result).toHaveLength(0);
  });

  it("derives primaryRole from the most-played hero", () => {
    const result = processPlayerScatterStats(
      baseData(
        [
          row({ player_name: "A", player_hero: "Ana", hero_time_played: 100 }),
          row({ player_name: "A", player_hero: "Reinhardt", hero_time_played: 900 }),
        ],
        ["A"]
      )
    );
    expect(result[0].primaryRole).toBe("Tank");
  });

  it("returns players sorted by name", () => {
    const result = processPlayerScatterStats(
      baseData(
        [
          row({ player_name: "Zed", player_hero: "Ana" }),
          row({ player_name: "Abe", player_hero: "Ana" }),
          row({ player_name: "Mia", player_hero: "Ana" }),
        ],
        ["Zed", "Abe", "Mia"]
      )
    );
    expect(result.map((p) => p.playerName)).toEqual(["Abe", "Mia", "Zed"]);
  });
});
