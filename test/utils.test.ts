import { removeDuplicateRows, toHero, toTitleCase } from "@/lib/utils";
import { PlayerStat } from "@prisma/client";
import { expect, test } from "vitest";

test("should return a hero name that is lowercase and without accents", () => {
  const name = "Lúcio"; // edge case with an accent
  const hero = toHero(name);
  expect(hero).toBe("lucio");

  const name2 = "D.Va"; // edge case with a period
  const hero2 = toHero(name2);
  expect(hero2).toBe("dva");

  const name3 = "Soldier: 76"; // edge case with a colon and a space
  const hero3 = toHero(name3);
  expect(hero3).toBe("soldier76");
});

test("should return a title case string", () => {
  const str = "lijiang tower (lunar new year)"; // edge case with parentheses
  const title = toTitleCase(str);
  expect(title).toBe("Lijiang Tower (Lunar New Year)");

  const str2 = "Circuit royal"; // occurs in the logs
  const title2 = toTitleCase(str2);
  expect(title2).toBe("Circuit Royal");
});

test("should remove duplicates from an array of PlayerStatRows", () => {
  const sampleData: Omit<PlayerStat, "id"> = {
    scrimId: 1,
    event_type: "player_stat",
    match_time: 123,
    round_number: 1,
    player_team: "Team 1",
    player_name: "lux",
    player_hero: "Ana",
    eliminations: 10,
    final_blows: 5,
    deaths: 0,
    all_damage_dealt: 0,
    barrier_damage_dealt: 0,
    hero_damage_dealt: 0,
    healing_dealt: 0,
    healing_received: 0,
    self_healing: 0,
    damage_taken: 0,
    damage_blocked: 0,
    defensive_assists: 0,
    offensive_assists: 0,
    ultimates_earned: 0,
    ultimates_used: 0,
    multikill_best: 0,
    multikills: 0,
    solo_kills: 0,
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
    hero_time_played: 0,
    MapDataId: 0,
  };

  const arr: PlayerStat[] = [
    {
      id: 1, // unique
      ...sampleData,
    },
    {
      id: 2, // duplicate
      ...sampleData,
    },
    {
      id: 3, // duplicate
      ...sampleData,
    },
  ];

  const expected = [arr[0]]; // remove the duplicates

  const unique = removeDuplicateRows(arr);

  expect(unique).toEqual(expected);
});
