import "server-only";

import { processBanImpactAnalysis } from "@/data/team/ban-impact-service";
import type { BaseTeamData } from "@/data/team/shared-core";
import prisma from "@/lib/prisma";
import type { ComputedRow } from "@/lib/query-builder/aggregate";
import { getTeamData } from "@/lib/query-builder/compute/shared";

function scopedTeamData(
  data: Awaited<ReturnType<typeof getTeamData>>,
  scrimIds: number[]
): BaseTeamData {
  const inScope = new Set(scrimIds);
  const mapDataRecords = data.mapDataRecords.filter((record) => {
    const scrimId = record.Scrim?.id;
    return scrimId !== undefined && inScope.has(scrimId);
  });
  const mapDataIds = new Set(mapDataRecords.map((record) => record.id));

  return {
    ...data,
    mapDataRecords,
    mapDataIds: Array.from(mapDataIds),
    allPlayerStats: data.allPlayerStats.filter(
      (row) => row.MapDataId !== null && mapDataIds.has(row.MapDataId)
    ),
    matchStarts: data.matchStarts.filter(
      (row) => row.MapDataId !== null && mapDataIds.has(row.MapDataId)
    ),
    finalRounds: data.finalRounds.filter(
      (row) => row.MapDataId !== null && mapDataIds.has(row.MapDataId)
    ),
    captures: data.captures.filter(
      (row) => row.MapDataId !== null && mapDataIds.has(row.MapDataId)
    ),
    payloadProgresses: data.payloadProgresses.filter(
      (row) => row.MapDataId !== null && mapDataIds.has(row.MapDataId)
    ),
    pointProgresses: data.pointProgresses.filter(
      (row) => row.MapDataId !== null && mapDataIds.has(row.MapDataId)
    ),
  };
}

/**
 * Emit one summary row per hero and ban direction. This exposes the team
 * ban-impact dashboard's received/outgoing calculations to the query builder.
 */
export async function computeBanImpact(
  teamId: number,
  scrimIds: number[]
): Promise<ComputedRow[]> {
  const data = scopedTeamData(await getTeamData(teamId), scrimIds);
  if (data.mapDataIds.length === 0) return [];

  const heroBans = await prisma.heroBan.findMany({
    where: { MapDataId: { in: data.mapDataIds } },
    select: { MapDataId: true, team: true, hero: true },
  });
  const analysis = processBanImpactAnalysis(data, heroBans);

  const weakPoints = new Set(
    analysis.received.weakPoints.map((impact) => impact.hero)
  );
  const strongBans = new Set(
    analysis.outgoing.strongBans.map((impact) => impact.hero)
  );

  const rows: ComputedRow[] = [];
  for (const impact of analysis.received.banImpacts) {
    rows.push({
      hero: impact.hero,
      side: "banned by enemy",
      tag: weakPoints.has(impact.hero) ? "weak point" : "normal",
      ban_rate: impact.banRate,
      maps_played: impact.mapsPlayed,
      maps_banned: impact.mapsBanned,
      total_bans: impact.totalBans,
      win_rate_with: impact.winRateWithHero,
      win_rate_without: impact.winRateWithoutHero,
      win_rate_delta: impact.winRateDelta,
    });
  }

  for (const impact of analysis.outgoing.ourBanImpacts) {
    rows.push({
      hero: impact.hero,
      side: "banned by us",
      tag: strongBans.has(impact.hero) ? "strong ban" : "normal",
      ban_rate: impact.banRate,
      maps_played: impact.mapsPlayed,
      maps_banned: impact.mapsBanned,
      total_bans: impact.totalBans,
      win_rate_with: impact.winRateWhenBanned,
      win_rate_without: impact.winRateWhenNotBanned,
      win_rate_delta: impact.winRateDelta,
    });
  }

  return rows;
}
