import "server-only";

import { findTeamNameForMapInMemory } from "@/data/team/shared-core";
import { determineRole } from "@/lib/player-table-data";
import type { ComputedRow } from "@/lib/query-builder/aggregate";
import { getTeamData } from "@/lib/query-builder/compute/shared";
import type { HeroName } from "@/types/heroes";

type HeroBucket = {
  timePlayed: number;
  games: Set<number>;
};

/**
 * Emit one row per player/hero pair with player-pool and team-hero playtime
 * denominators. This is the queryable form of the team hero-pickrate heatmap.
 */
export async function computeHeroPickrate(
  teamId: number,
  scrimIds: number[]
): Promise<ComputedRow[]> {
  if (scrimIds.length === 0) return [];

  const data = await getTeamData(teamId);
  const inScope = new Set(scrimIds);
  const byPlayerHero = new Map<string, Map<HeroName, HeroBucket>>();
  const totalByPlayer = new Map<string, number>();
  const totalByHero = new Map<HeroName, number>();

  for (const record of data.mapDataRecords) {
    if (!record.Scrim || !inScope.has(record.Scrim.id)) continue;

    const teamName = findTeamNameForMapInMemory(
      record.id,
      data.allPlayerStats,
      data.teamRosterSet
    );
    if (!teamName) continue;

    const playersOnMap = data.allPlayerStats.filter(
      (stat) => stat.MapDataId === record.id && stat.player_team === teamName
    );
    if (!playersOnMap.every((p) => data.teamRosterSet.has(p.player_name))) {
      continue;
    }

    for (const stat of playersOnMap) {
      const hero = stat.player_hero as HeroName;
      const role = determineRole(hero);
      if (role !== "Tank" && role !== "Damage" && role !== "Support") {
        continue;
      }

      const player = stat.player_name;
      if (!byPlayerHero.has(player)) {
        byPlayerHero.set(player, new Map());
      }
      const heroes = byPlayerHero.get(player)!;
      if (!heroes.has(hero)) {
        heroes.set(hero, { timePlayed: 0, games: new Set() });
      }

      const bucket = heroes.get(hero)!;
      bucket.timePlayed += stat.hero_time_played;
      bucket.games.add(record.id);
      totalByPlayer.set(
        player,
        (totalByPlayer.get(player) ?? 0) + stat.hero_time_played
      );
      totalByHero.set(
        hero,
        (totalByHero.get(hero) ?? 0) + stat.hero_time_played
      );
    }
  }

  const rows: ComputedRow[] = [];
  for (const [player, heroes] of byPlayerHero.entries()) {
    const playerTotal = totalByPlayer.get(player) ?? 0;
    for (const [hero, bucket] of heroes.entries()) {
      const heroTotal = totalByHero.get(hero) ?? 0;
      rows.push({
        player,
        hero,
        role: determineRole(hero),
        time_played: bucket.timePlayed,
        player_total_time_played: playerTotal,
        hero_total_time_played: heroTotal,
        games: bucket.games.size,
        pick_rate: playerTotal > 0 ? bucket.timePlayed / playerTotal : 0,
        ownership_rate: heroTotal > 0 ? bucket.timePlayed / heroTotal : 0,
      });
    }
  }

  return rows;
}
