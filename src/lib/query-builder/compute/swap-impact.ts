import "server-only";

import type { ComputedRow } from "@/lib/query-builder/aggregate";
import { buildMapMeta, getTeamData } from "@/lib/query-builder/compute/shared";
import prisma from "@/lib/prisma";
import { calculateWinner } from "@/lib/winrate";
import {
  buildCapturesMaps,
  buildFinalRoundMap,
  buildMatchStartMap,
  buildProgressMaps,
  findTeamNameForMapInMemory,
} from "@/data/team/shared-core";
import type { HeroSwap, MatchEnd } from "@prisma/client";

function byMap<T extends { MapDataId: number | null }>(
  rows: T[]
): Map<number, T[]> {
  const map = new Map<number, T[]>();
  for (const row of rows) {
    if (row.MapDataId == null) continue;
    const bucket = map.get(row.MapDataId);
    if (bucket) bucket.push(row);
    else map.set(row.MapDataId, [row]);
  }
  return map;
}

function swapCountBucket(count: number): string {
  if (count === 0) return "0 swaps";
  if (count === 1) return "1 swap";
  if (count === 2) return "2 swaps";
  return "3+ swaps";
}

function timingBucket(firstSwap: HeroSwap | null, matchEnd: MatchEnd | null) {
  if (!firstSwap || !matchEnd || matchEnd.match_time <= 0) return "none";
  const pct = (firstSwap.match_time / matchEnd.match_time) * 100;
  if (pct < 33.33) return "early";
  if (pct < 66.67) return "mid";
  return "late";
}

/**
 * Emit one row per map with our team's swap count and map result. This is the
 * row-level form of the hero-swap dashboard's custom winrate buckets, making
 * questions like "do we win more when we swap?" generic group/filter queries.
 */
export async function computeSwapImpact(
  teamId: number,
  scrimIds: number[]
): Promise<ComputedRow[]> {
  const data = await getTeamData(teamId);
  const meta = buildMapMeta(data);
  const inScope = new Set(scrimIds);
  const scopedMapIds = data.mapDataIds.filter((mapDataId) => {
    const m = meta.get(mapDataId);
    return m ? inScope.has(m.scrimId) : false;
  });
  if (scopedMapIds.length === 0) return [];

  const [swaps, matchEnds] = await Promise.all([
    prisma.heroSwap.findMany({
      where: { MapDataId: { in: scopedMapIds } },
      orderBy: { match_time: "asc" },
    }),
    prisma.matchEnd.findMany({
      where: { MapDataId: { in: scopedMapIds } },
      orderBy: { match_time: "desc" },
    }),
  ]);

  const swapsByMap = byMap(swaps);
  const matchEndsByMap = byMap(matchEnds);
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
  for (const mapDataId of scopedMapIds) {
    const m = meta.get(mapDataId);
    const matchStart = matchStartMap.get(mapDataId) ?? null;
    if (!m?.ourTeam || !matchStart) continue;

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

    const ourTeam =
      m.ourTeam ??
      findTeamNameForMapInMemory(
        mapDataId,
        data.allPlayerStats,
        data.teamRosterSet
      );
    if (!ourTeam) continue;

    const ourSwaps = (swapsByMap.get(mapDataId) ?? []).filter(
      (swap) => swap.player_team === ourTeam
    );
    const firstSwap = ourSwaps[0] ?? null;
    const matchEnd = matchEndsByMap.get(mapDataId)?.[0] ?? null;
    const swapCount = ourSwaps.length;
    const won = winner === ourTeam;

    rows.push({
      won: won ? 1 : 0,
      result: won ? "win" : "loss",
      had_swap: swapCount > 0 ? "yes" : "no",
      swap_count: swapCount,
      swap_count_bucket: swapCountBucket(swapCount),
      first_swap_timing: timingBucket(firstSwap, matchEnd),
      map: matchStart.map_name,
      map_type: matchStart.map_type,
      scrim: m.scrim,
    });
  }

  return rows;
}
