import "server-only";

import type { ComputedRow } from "@/lib/query-builder/aggregate";
import { getTeamData } from "@/lib/query-builder/compute/shared";
import { determineRole } from "@/lib/player-table-data";
import { calculateWinner } from "@/lib/winrate";
import {
  buildCapturesMaps,
  buildFinalRoundMap,
  buildMatchStartMap,
  buildProgressMaps,
  findTeamNameForMapInMemory,
} from "@/data/team/shared-core";
import type { HeroName } from "@/types/heroes";

/**
 * Emit one row per player/hero/map appearance for our team, tagged with the
 * computed map result. This is the generic query-builder form of the team
 * hero-pool dashboard's most-played heroes, hero winrates, and role slices.
 */
export async function computeHeroPool(
  teamId: number,
  scrimIds: number[]
): Promise<ComputedRow[]> {
  const data = await getTeamData(teamId);
  const inScope = new Set(scrimIds);

  const finalRoundMap = buildFinalRoundMap(data.finalRounds);
  const matchStartMap = buildMatchStartMap(data.matchStarts);
  const { team1CapturesMap, team2CapturesMap } = buildCapturesMaps(
    data.captures,
    matchStartMap
  );
  const {
    team1ProgressMap: team1PayloadProgressMap,
    team2ProgressMap: team2PayloadProgressMap,
  } = buildProgressMaps(data.payloadProgresses, matchStartMap);
  const {
    team1ProgressMap: team1PointProgressMap,
    team2ProgressMap: team2PointProgressMap,
  } = buildProgressMaps(data.pointProgresses, matchStartMap);

  const rows: ComputedRow[] = [];
  for (const mapDataRecord of data.mapDataRecords) {
    const mapDataId = mapDataRecord.id;
    const scrimId = mapDataRecord.Scrim?.id;
    if (!scrimId || !inScope.has(scrimId)) continue;

    const matchStart = matchStartMap.get(mapDataId) ?? null;
    const teamName = findTeamNameForMapInMemory(
      mapDataId,
      data.allPlayerStats,
      data.teamRosterSet
    );
    if (!teamName || !matchStart) continue;

    const winner = calculateWinner({
      matchDetails: matchStart,
      finalRound: finalRoundMap.get(mapDataId) ?? null,
      team1Captures: team1CapturesMap.get(mapDataId) ?? [],
      team2Captures: team2CapturesMap.get(mapDataId) ?? [],
      team1PayloadProgress: team1PayloadProgressMap.get(mapDataId) ?? [],
      team2PayloadProgress: team2PayloadProgressMap.get(mapDataId) ?? [],
      team1PointProgress: team1PointProgressMap.get(mapDataId) ?? [],
      team2PointProgress: team2PointProgressMap.get(mapDataId) ?? [],
    });
    if (winner === "N/A") continue;

    const won = winner === teamName;
    const playersOnMap = data.allPlayerStats.filter(
      (stat) => stat.MapDataId === mapDataId && stat.player_team === teamName
    );

    for (const stat of playersOnMap) {
      const hero = stat.player_hero as HeroName;
      const role = determineRole(hero);
      if (role !== "Tank" && role !== "Damage" && role !== "Support") continue;

      rows.push({
        won: won ? 1 : 0,
        result: won ? "win" : "loss",
        player: stat.player_name,
        hero,
        role,
        time_played: stat.hero_time_played,
        eliminations: stat.eliminations,
        final_blows: stat.final_blows,
        deaths: stat.deaths,
        assists: stat.offensive_assists,
        hero_damage: stat.hero_damage_dealt,
        damage_taken: stat.damage_taken,
        healing: stat.healing_dealt,
        ultimates_earned: stat.ultimates_earned,
        ultimates_used: stat.ultimates_used,
        map: matchStart.map_name,
        map_type: matchStart.map_type,
        scrim: mapDataRecord.Scrim?.name ?? "Scrim",
      });
    }
  }

  return rows;
}
