import "server-only";

import { processBestRoleTrios } from "@/data/team/role-stats-service";
import type { BaseTeamData } from "@/data/team/shared-core";
import type { ComputedRow } from "@/lib/query-builder/aggregate";
import { getTeamData } from "@/lib/query-builder/compute/shared";

function scopedTeamData(data: BaseTeamData, scrimIds: number[]): BaseTeamData {
  const inScope = new Set(scrimIds);
  const mapDataRecords = data.mapDataRecords.filter(
    (record) => record.Scrim && inScope.has(record.Scrim.id)
  );
  const scopedMapIds = new Set(mapDataRecords.map((record) => record.id));

  function hasScopedMap(row: { MapDataId: number | null }): boolean {
    return row.MapDataId != null && scopedMapIds.has(row.MapDataId);
  }

  return {
    ...data,
    mapDataRecords,
    mapDataIds: data.mapDataIds.filter((id) => scopedMapIds.has(id)),
    allPlayerStats: data.allPlayerStats.filter(hasScopedMap),
    matchStarts: data.matchStarts.filter(hasScopedMap),
    finalRounds: data.finalRounds.filter(hasScopedMap),
    captures: data.captures.filter(hasScopedMap),
    payloadProgresses: data.payloadProgresses.filter(hasScopedMap),
    pointProgresses: data.pointProgresses.filter(hasScopedMap),
  };
}

function playerMembership(players: string[]): string {
  return [...new Set(players)].sort((a, b) => a.localeCompare(b)).join("|");
}

/**
 * Emit one row per high-sample role trio from the same lineup analysis used by
 * the team role-stats dashboard. The query layer can then filter by any player
 * in the lineup and aggregate wins/losses with weighted win-rate ratios.
 */
export async function computeRoleTrios(
  teamId: number,
  scrimIds: number[]
): Promise<ComputedRow[]> {
  if (scrimIds.length === 0) return [];

  const data = scopedTeamData(await getTeamData(teamId), scrimIds);
  return processBestRoleTrios(data).map((trio) => {
    const players = [
      trio.tank,
      trio.dps1,
      trio.dps2,
      trio.support1,
      trio.support2,
    ];
    return {
      trio: players.join(" / "),
      player: playerMembership(players),
      tank: trio.tank,
      dps1: trio.dps1,
      dps2: trio.dps2,
      support1: trio.support1,
      support2: trio.support2,
      games: trio.gamesPlayed,
      wins: trio.wins,
      losses: trio.losses,
      win_rate: trio.gamesPlayed > 0 ? trio.wins / trio.gamesPlayed : 0,
    };
  });
}
