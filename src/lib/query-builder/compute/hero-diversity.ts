import "server-only";

import { findTeamNameForMapInMemory } from "@/data/team/shared-core";
import { determineRole } from "@/lib/player-table-data";
import type { ComputedRow } from "@/lib/query-builder/aggregate";
import { getTeamData } from "@/lib/query-builder/compute/shared";
import { allHeroes, type HeroName } from "@/types/heroes";

type Role = "Tank" | "Damage" | "Support";

type HeroRoleTotals = {
  heroes: Set<HeroName>;
  effectiveHeroes: Set<HeroName>;
  maps: Set<number>;
  heroMaps: Map<HeroName, Set<number>>;
  heroPlayers: Map<HeroName, Set<string>>;
  totalPlaytime: number;
  appearances: number;
};

const ROLES: Role[] = ["Tank", "Damage", "Support"];
const MIN_MAPS_FOR_EFFECTIVE_HERO = 3;

function emptyTotals(): HeroRoleTotals {
  return {
    heroes: new Set<HeroName>(),
    effectiveHeroes: new Set<HeroName>(),
    maps: new Set<number>(),
    heroMaps: new Map<HeroName, Set<number>>(),
    heroPlayers: new Map<HeroName, Set<string>>(),
    totalPlaytime: 0,
    appearances: 0,
  };
}

const maxHeroesByRole = new Map<Role, number>();
for (const hero of allHeroes) {
  const role = determineRole(hero.name);
  if (role !== "Tank" && role !== "Damage" && role !== "Support") continue;
  maxHeroesByRole.set(role, (maxHeroesByRole.get(role) ?? 0) + 1);
}

/**
 * Queryable version of the hero-pool dashboard's diversity summary. It emits
 * one row per role so generic aggregation can compare thin and deep role pools
 * without needing distinct-count support.
 */
export async function computeHeroDiversity(
  teamId: number,
  scrimIds: number[]
): Promise<ComputedRow[]> {
  if (scrimIds.length === 0) return [];

  const data = await getTeamData(teamId);
  const inScope = new Set(scrimIds);
  const totalsByRole = new Map<Role, HeroRoleTotals>(
    ROLES.map((role) => [role, emptyTotals()])
  );

  for (const record of data.mapDataRecords) {
    const scrimId = record.Scrim?.id;
    if (!scrimId || !inScope.has(scrimId)) continue;

    const teamName = findTeamNameForMapInMemory(
      record.id,
      data.allPlayerStats,
      data.teamRosterSet
    );
    if (!teamName) continue;

    const playersOnMap = data.allPlayerStats.filter(
      (stat) => stat.MapDataId === record.id && stat.player_team === teamName
    );
    if (
      !playersOnMap.every((stat) => data.teamRosterSet.has(stat.player_name))
    ) {
      continue;
    }

    for (const stat of playersOnMap) {
      if (stat.hero_time_played <= 0) continue;

      const hero = stat.player_hero as HeroName;
      const role = determineRole(hero);
      if (role !== "Tank" && role !== "Damage" && role !== "Support") continue;

      const totals = totalsByRole.get(role) ?? emptyTotals();
      totals.heroes.add(hero);
      totals.maps.add(record.id);
      totals.totalPlaytime += stat.hero_time_played;
      totals.appearances++;

      const maps = totals.heroMaps.get(hero) ?? new Set<number>();
      maps.add(record.id);
      totals.heroMaps.set(hero, maps);

      const players = totals.heroPlayers.get(hero) ?? new Set<string>();
      players.add(stat.player_name);
      totals.heroPlayers.set(hero, players);
      totalsByRole.set(role, totals);
    }
  }

  for (const totals of totalsByRole.values()) {
    for (const [hero, maps] of totals.heroMaps.entries()) {
      if (maps.size >= MIN_MAPS_FOR_EFFECTIVE_HERO) {
        totals.effectiveHeroes.add(hero);
      }
    }
  }

  return ROLES.map((role) => {
    const totals = totalsByRole.get(role) ?? emptyTotals();
    const maxHeroes = maxHeroesByRole.get(role) ?? 0;
    const uniqueHeroes = totals.heroes.size;
    const effectiveHeroes = totals.effectiveHeroes.size;
    const totalHeroMapAppearances = Array.from(totals.heroMaps.values()).reduce(
      (sum, maps) => sum + maps.size,
      0
    );
    const specialistHeroes = Array.from(totals.heroPlayers.values()).filter(
      (players) => players.size === 1
    ).length;
    const sharedHeroes = Array.from(totals.heroPlayers.values()).filter(
      (players) => players.size > 1
    ).length;
    const diversityScore =
      maxHeroes > 0 ? Math.min((uniqueHeroes / maxHeroes) * 100, 100) : 0;
    return {
      role,
      unique_heroes: uniqueHeroes,
      effective_hero_pool: effectiveHeroes,
      diversity_score: diversityScore,
      role_coverage: maxHeroes > 0 ? uniqueHeroes / maxHeroes : 0,
      role_capacity: maxHeroes,
      maps_played: totals.maps.size,
      total_playtime: totals.totalPlaytime,
      appearances: totals.appearances,
      average_maps_per_hero:
        uniqueHeroes > 0 ? totalHeroMapAppearances / uniqueHeroes : 0,
      specialist_heroes: specialistHeroes,
      shared_heroes: sharedHeroes,
    };
  });
}
