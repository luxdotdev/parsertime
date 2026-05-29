import "server-only";

import { AppRuntime } from "@/data/runtime";
import type { BaseTeamData } from "@/data/team/shared-core";
import { TeamSharedDataService } from "@/data/team/shared-data-service";
import { processTeamMatchResults } from "@/data/team/trends-service";
import { assessConfidence } from "@/lib/confidence";
import type { ComputedRow } from "@/lib/query-builder/aggregate";
import { Effect } from "effect";

const HALF_LIFE_DAYS = 90;
const DECAY_CONSTANT = Math.LN2 / HALF_LIFE_DAYS;
const RECENT_MAP_WINDOW = 10;
const TREND_THRESHOLD = 10;

type MapResult = {
  mapName: string;
  mapType: string;
  isWin: boolean;
  date: Date;
};

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

function calculateWeight(matchDate: Date): number {
  const daysAgo = (Date.now() - matchDate.getTime()) / (1000 * 60 * 60 * 24);
  return Math.exp(-DECAY_CONSTANT * daysAgo);
}

function trendFor(delta: number): "improving" | "declining" | "stable" {
  if (delta > TREND_THRESHOLD) return "improving";
  if (delta < -TREND_THRESHOLD) return "declining";
  return "stable";
}

/**
 * Team-scoped map intelligence inspired by the scouting map-intelligence
 * service: one row per map with overall, recent-window, and time-decayed
 * win-rate ingredients so `/query` can pivot by map or map type.
 */
export async function computeMapIntelligence(
  teamId: number,
  scrimIds: number[]
): Promise<ComputedRow[]> {
  if (scrimIds.length === 0) return [];

  const data = scopedTeamData(
    await AppRuntime.runPromise(
      TeamSharedDataService.pipe(
        Effect.flatMap((svc) =>
          svc.getBaseTeamData(teamId, { includeDateInfo: true })
        )
      )
    ),
    scrimIds
  );

  const mapTypeByName = new Map<string, string>();
  for (const start of data.matchStarts) {
    mapTypeByName.set(start.map_name, start.map_type);
  }

  const byMap = new Map<string, MapResult[]>();
  for (const result of processTeamMatchResults(data, data.mapDataRecords)) {
    const mapType = mapTypeByName.get(result.mapName) ?? "Unknown";
    const rows = byMap.get(result.mapName) ?? [];
    rows.push({
      mapName: result.mapName,
      mapType,
      isWin: result.isWin,
      date: result.date,
    });
    byMap.set(result.mapName, rows);
  }

  const rows: ComputedRow[] = [];
  for (const [mapName, results] of byMap.entries()) {
    results.sort((a, b) => b.date.getTime() - a.date.getTime());

    const maps = results.length;
    const wins = results.filter((result) => result.isWin).length;
    const losses = maps - wins;
    const recent = results.slice(0, RECENT_MAP_WINDOW);
    const recentMaps = recent.length;
    const recentWins = recent.filter((result) => result.isWin).length;
    const recentLosses = recentMaps - recentWins;

    let weightedWins = 0;
    let weightedMaps = 0;
    for (const result of results) {
      const weight = calculateWeight(result.date);
      weightedWins += result.isWin ? weight : 0;
      weightedMaps += weight;
    }

    const winRate = maps > 0 ? (wins / maps) * 100 : 0;
    const recentWinRate = recentMaps > 0 ? (recentWins / recentMaps) * 100 : 0;
    const trendDelta = recentWinRate - winRate;
    const confidence = assessConfidence(maps);

    rows.push({
      map: mapName,
      map_type: results[0]?.mapType ?? "Unknown",
      trend: trendFor(trendDelta),
      confidence: confidence.level,
      maps,
      wins,
      losses,
      win_rate_value: winRate,
      recent_maps: recentMaps,
      recent_wins: recentWins,
      recent_losses: recentLosses,
      recent_win_rate_value: recentWinRate,
      weighted_wins: weightedWins,
      weighted_maps: weightedMaps,
      trend_delta: trendDelta,
    });
  }

  return rows;
}
