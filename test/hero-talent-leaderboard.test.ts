import { buildHeroTalentLeaderboard } from "@/lib/hero-talent-leaderboard";
import type { PlayerStat } from "@prisma/client";
import { describe, expect, test } from "vitest";

function makeStat(
  id: number,
  playerName: string,
  overrides: Partial<PlayerStat>
): PlayerStat {
  return {
    id,
    scrimId: id,
    event_type: "player_stat",
    match_time: 600,
    round_number: 1,
    player_team: "Team",
    player_name: playerName,
    player_hero: "Tracer",
    eliminations: 20,
    final_blows: 8,
    deaths: 5,
    all_damage_dealt: 8000,
    barrier_damage_dealt: 0,
    hero_damage_dealt: 8000,
    healing_dealt: 0,
    healing_received: 0,
    self_healing: 0,
    damage_taken: 3000,
    damage_blocked: 0,
    defensive_assists: 0,
    offensive_assists: 0,
    ultimates_earned: 2,
    ultimates_used: 2,
    multikill_best: 0,
    multikills: 0,
    solo_kills: 1,
    objective_kills: 0,
    environmental_kills: 0,
    environmental_deaths: 0,
    critical_hits: 0,
    critical_hit_accuracy: 0,
    scoped_accuracy: 0,
    scoped_critical_hit_accuracy: 0,
    scoped_critical_hit_kills: 0,
    shots_fired: 0,
    shots_hit: 0,
    shots_missed: 0,
    scoped_shots: 0,
    scoped_shots_hit: 0,
    weapon_accuracy: 0,
    hero_time_played: 600,
    MapDataId: id,
    ...overrides,
  };
}

function playerRows(
  playerName: string,
  startId: number,
  overrides: Partial<PlayerStat>
): PlayerStat[] {
  return Array.from({ length: 10 }, (_, index) =>
    makeStat(startId + index, playerName, overrides)
  );
}

describe("buildHeroTalentLeaderboard", () => {
  test("ranks players from only the supplied timeframe stats", () => {
    const oldRows = [
      ...playerRows("Alice", 1, {
        eliminations: 32,
        final_blows: 16,
        deaths: 2,
        hero_damage_dealt: 12000,
        solo_kills: 4,
      }),
      ...playerRows("Bob", 101, {
        eliminations: 20,
        final_blows: 8,
        deaths: 5,
        hero_damage_dealt: 8000,
        solo_kills: 1,
      }),
      ...playerRows("Charlie", 201, {
        eliminations: 12,
        final_blows: 4,
        deaths: 8,
        hero_damage_dealt: 5000,
        solo_kills: 0,
      }),
    ];
    const recentRows = [
      ...playerRows("Alice", 301, {
        eliminations: 10,
        final_blows: 3,
        deaths: 9,
        hero_damage_dealt: 4500,
        solo_kills: 0,
      }),
      ...playerRows("Bob", 401, {
        eliminations: 34,
        final_blows: 17,
        deaths: 2,
        hero_damage_dealt: 12500,
        solo_kills: 5,
      }),
      ...playerRows("Charlie", 501, {
        eliminations: 20,
        final_blows: 8,
        deaths: 5,
        hero_damage_dealt: 8000,
        solo_kills: 1,
      }),
    ];

    expect(buildHeroTalentLeaderboard(oldRows, "Tracer")[0]?.player_name).toBe(
      "Alice"
    );
    expect(
      buildHeroTalentLeaderboard([...oldRows, ...recentRows], "Tracer")[0]
        ?.player_name
    ).toBe("Bob");
    expect(
      buildHeroTalentLeaderboard(recentRows, "Tracer")[0]?.player_name
    ).toBe("Bob");
  });
});
