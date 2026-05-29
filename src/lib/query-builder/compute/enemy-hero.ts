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
 * Emit one row per map/enemy-hero appearance. This mirrors the team matchup
 * dashboard's enemy hero analysis, but keeps the rows queryable by hero, role,
 * map type, scrim, and result.
 */
export async function computeEnemyHeroMatchups(
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

    const playersOnMap = data.allPlayerStats.filter(
      (stat) => stat.MapDataId === mapDataId && stat.player_team === teamName
    );
    if (!playersOnMap.every((p) => data.teamRosterSet.has(p.player_name))) {
      continue;
    }

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
    const enemyHeroes = new Set(
      data.allPlayerStats
        .filter(
          (stat) =>
            stat.MapDataId === mapDataId && stat.player_team !== teamName
        )
        .map((stat) => stat.player_hero)
    );

    for (const hero of enemyHeroes) {
      const role = determineRole(hero as HeroName);
      if (role !== "Tank" && role !== "Damage" && role !== "Support") {
        continue;
      }

      rows.push({
        won: won ? 1 : 0,
        result: won ? "win" : "loss",
        enemy_hero: hero,
        enemy_role: role,
        map: matchStart.map_name,
        map_type: matchStart.map_type,
        scrim: mapDataRecord.Scrim?.name ?? "Scrim",
      });
    }
  }

  return rows;
}
