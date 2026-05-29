import "server-only";

import { processTeamWinrates } from "@/data/team/stats-service";
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
 * Emit one row per map and exact five-player roster variant, mirroring the
 * team winrate dashboard's per-map roster breakdown.
 */
export async function computeRosterVariants(
  teamId: number,
  scrimIds: number[]
): Promise<ComputedRow[]> {
  if (scrimIds.length === 0) return [];

  const data = scopedTeamData(await getTeamData(teamId), scrimIds);
  const winrates = processTeamWinrates(data);
  const rows: ComputedRow[] = [];

  for (const mapData of Object.values(winrates.byMap)) {
    for (const variant of mapData.rosterVariants) {
      const games = variant.wins + variant.losses;
      rows.push({
        map: mapData.mapName,
        roster: variant.players.join(" / "),
        player: playerMembership(variant.players),
        player_count: variant.players.length,
        games,
        wins: variant.wins,
        losses: variant.losses,
        win_rate: games > 0 ? variant.wins / games : 0,
        is_best_for_map:
          mapData.bestRoster?.join("|") === variant.players.join("|")
            ? "yes"
            : "no",
      });
    }
  }

  return rows;
}
