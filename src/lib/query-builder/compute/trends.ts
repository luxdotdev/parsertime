import "server-only";

import { AppRuntime } from "@/data/runtime";
import { processTeamMatchResults } from "@/data/team/trends-service";
import { TeamSharedDataService } from "@/data/team/shared-data-service";
import type { BaseTeamData } from "@/data/team/shared-core";
import type { ComputedRow } from "@/lib/query-builder/aggregate";
import { Effect } from "effect";

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

function weekStart(date: Date): Date {
  const out = new Date(date);
  const day = out.getDay();
  const diff = out.getDate() - day + (day === 0 ? -6 : 1);
  out.setDate(diff);
  out.setHours(0, 0, 0, 0);
  return out;
}

function monthStart(date: Date): Date {
  const out = new Date(date);
  out.setDate(1);
  out.setHours(0, 0, 0, 0);
  return out;
}

function formatDay(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "long" });
}

function formatPeriod(date: Date, kind: "week" | "month"): string {
  return kind === "week"
    ? date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function recentBuckets(index: number): string {
  const buckets: string[] = [];
  if (index < 5) buckets.push("last 5");
  if (index < 10) buckets.push("last 10");
  if (index < 20) buckets.push("last 20");
  return buckets.join("|");
}

/** Emit one row per map result with trend-friendly time and recent-form fields. */
export async function computeTrends(
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
  const results = processTeamMatchResults(data, data.mapDataRecords).sort(
    (a, b) => b.date.getTime() - a.date.getTime()
  );

  return results.map((result, index) => {
    const week = weekStart(result.date);
    const month = monthStart(result.date);
    return {
      won: result.isWin ? 1 : 0,
      loss: result.isWin ? 0 : 1,
      result: result.isWin ? "win" : "loss",
      map: result.mapName,
      scrim: result.scrimName,
      date: result.date.toISOString().slice(0, 10),
      day_of_week: formatDay(result.date),
      week: formatPeriod(week, "week"),
      month: formatPeriod(month, "month"),
      recent_bucket: recentBuckets(index),
      recent_rank: index + 1,
    };
  });
}
