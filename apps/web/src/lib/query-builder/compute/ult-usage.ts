import "server-only";

import { processTeamUltStats } from "@/data/team/ult-service";
import type { ExtendedTeamData } from "@/data/team/shared-core";
import type { ComputedRow } from "@/lib/query-builder/aggregate";
import { getTeamData } from "@/lib/query-builder/compute/shared";
import prisma from "@/lib/prisma";

function scopedTeamData(
  data: ExtendedTeamData,
  scrimIds: number[]
): ExtendedTeamData {
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
    allKills: data.allKills.filter(hasScopedMap),
    allRezzes: data.allRezzes.filter(hasScopedMap),
    allUltimates: data.allUltimates.filter(hasScopedMap),
  };
}

/**
 * Emit player and fight-opening hero summaries from the same ultimate usage
 * post-processing that powers the team ultimates dashboard.
 */
export async function computeUltUsage(
  teamId: number,
  scrimIds: number[]
): Promise<ComputedRow[]> {
  if (scrimIds.length === 0) return [];

  const data = scopedTeamData(await getTeamData(teamId), scrimIds);
  const calculatedStats = await prisma.calculatedStat.findMany({
    where: {
      MapDataId: { in: data.mapDataIds },
      stat: { in: ["AVERAGE_ULT_CHARGE_TIME", "AVERAGE_TIME_TO_USE_ULT"] },
    },
  });
  const stats = processTeamUltStats(data, calculatedStats);
  const rows: ComputedRow[] = [];

  for (const player of stats.playerRankings) {
    rows.push({
      row_type: "player",
      player: player.playerName,
      hero: player.primaryHero || null,
      top_fight_opening_hero: player.topFightOpeningHero,
      ults_used: player.totalUltsUsed,
      maps_played: player.mapsPlayed,
      ults_per_map: player.ultsPerMap,
      fight_openings: player.fightOpeningCount,
    });
  }

  for (const opener of stats.topFightOpeningHeroes) {
    rows.push({
      row_type: "fight opening hero",
      player: null,
      hero: opener.hero,
      top_fight_opening_hero: opener.hero,
      ults_used: 0,
      maps_played: stats.totalMaps,
      ults_per_map: stats.totalMaps > 0 ? opener.count / stats.totalMaps : 0,
      fight_openings: opener.count,
    });
  }

  return rows;
}
