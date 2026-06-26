import "server-only";

import {
  buildCapturesMaps,
  buildFinalRoundMap,
  buildMatchStartMap,
  buildProgressMaps,
  findTeamNameForMapInMemory,
} from "@/data/team/shared-core";
import type { ComputedRow } from "@/lib/query-builder/aggregate";
import { getTeamData } from "@/lib/query-builder/compute/shared";
import { calculateWinner } from "@/lib/winrate";

type PlayerMapStats = {
  mapType: string;
  wins: number;
  losses: number;
};

/**
 * Emit one row per player/map pair with map-level wins and losses. This mirrors
 * the dashboard's player-map performance matrix, but keeps it scrim-scoped for
 * the generic query planner.
 */
export async function computePlayerMapPerformance(
  teamId: number,
  scrimIds: number[]
): Promise<ComputedRow[]> {
  if (scrimIds.length === 0) return [];

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

  const byPlayerMap = new Map<string, PlayerMapStats>();

  for (const record of data.mapDataRecords) {
    if (!record.Scrim || !inScope.has(record.Scrim.id)) continue;

    const mapDataId = record.id;
    const matchStart = matchStartMap.get(mapDataId) ?? null;
    const teamName = findTeamNameForMapInMemory(
      mapDataId,
      data.allPlayerStats,
      data.teamRosterSet
    );
    if (!teamName) continue;

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

    const mapName = matchStart?.map_name ?? record.name ?? "Unknown";
    const mapType = matchStart?.map_type ?? "Unknown";
    const isWin = winner === teamName;

    const uniquePlayers = new Set(playersOnMap.map((stat) => stat.player_name));
    for (const player of uniquePlayers) {
      const key = `${player}\u0000${mapName}`;
      const stats =
        byPlayerMap.get(key) ??
        ({
          mapType,
          wins: 0,
          losses: 0,
        } satisfies PlayerMapStats);
      if (isWin) stats.wins++;
      else stats.losses++;
      byPlayerMap.set(key, stats);
    }
  }

  return Array.from(byPlayerMap.entries()).map(([key, stats]) => {
    const [player, map] = key.split("\u0000");
    const games = stats.wins + stats.losses;
    return {
      player,
      map,
      map_type: stats.mapType,
      games,
      wins: stats.wins,
      losses: stats.losses,
      win_rate: games > 0 ? stats.wins / games : 0,
    };
  });
}
