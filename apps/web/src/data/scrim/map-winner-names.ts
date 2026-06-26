import "server-only";

import prisma from "@/lib/prisma";
import { resolveMapWinner } from "@/lib/winrate";
import type {
  MatchStart,
  ObjectiveCaptured,
  PayloadProgress,
  PointProgress,
  RoundEnd,
} from "@/generated/prisma/client";

function groupByMapData<T extends { MapDataId: number | null }>(
  rows: T[]
): Map<number, T[]> {
  const grouped = new Map<number, T[]>();
  for (const row of rows) {
    if (row.MapDataId == null) continue;
    const bucket = grouped.get(row.MapDataId);
    if (bucket) bucket.push(row);
    else grouped.set(row.MapDataId, [row]);
  }
  return grouped;
}

/**
 * Per-map winning team name for a scrim, resolved independently of the gated
 * scrim overview. Prefers the stored `Map.winner` (manual override or the
 * coordinate-derived Push result) and otherwise computes it from the map's
 * objective/score events via `calculateWinner`. Returns the literal team name
 * (or "N/A" when undeterminable), keyed by `Map.id` — never a perspective like
 * "our team", so it is safe to show even when the viewing team is unknown.
 */
export async function resolveScrimMapWinners(
  scrimId: number
): Promise<Map<number, string>> {
  const maps = await prisma.map.findMany({
    where: { scrimId },
    select: { id: true, winner: true, mapData: { select: { id: true } } },
  });

  const mapIdByMapData = new Map<number, number>();
  const storedWinnerByMapId = new Map<number, string | null>();
  const mapDataIds: number[] = [];
  for (const m of maps) {
    storedWinnerByMapId.set(m.id, m.winner);
    for (const md of m.mapData) {
      mapIdByMapData.set(md.id, m.id);
      mapDataIds.push(md.id);
    }
  }

  const result = new Map<number, string>();
  if (mapDataIds.length === 0) return result;

  const where = { MapDataId: { in: mapDataIds } };
  const [matchStarts, roundEnds, captures, payloads, points] =
    await Promise.all([
      prisma.matchStart.findMany({ where }),
      prisma.roundEnd.findMany({ where, orderBy: { round_number: "desc" } }),
      prisma.objectiveCaptured.findMany({
        where,
        orderBy: [{ round_number: "asc" }, { match_time: "asc" }],
      }),
      prisma.payloadProgress.findMany({ where }),
      prisma.pointProgress.findMany({ where }),
    ]);

  const matchStartByMapData = new Map<number, MatchStart>();
  for (const ms of matchStarts) {
    if (ms.MapDataId != null && !matchStartByMapData.has(ms.MapDataId)) {
      matchStartByMapData.set(ms.MapDataId, ms);
    }
  }
  // roundEnds are sorted round_number desc, so the first per map is the final.
  const finalRoundByMapData = new Map<number, RoundEnd>();
  for (const re of roundEnds) {
    if (re.MapDataId != null && !finalRoundByMapData.has(re.MapDataId)) {
      finalRoundByMapData.set(re.MapDataId, re);
    }
  }
  const capturesByMapData = groupByMapData<ObjectiveCaptured>(captures);
  const payloadsByMapData = groupByMapData<PayloadProgress>(payloads);
  const pointsByMapData = groupByMapData<PointProgress>(points);

  for (const [mapDataId, mapId] of mapIdByMapData) {
    const matchDetails = matchStartByMapData.get(mapDataId) ?? null;
    const finalRound = finalRoundByMapData.get(mapDataId) ?? null;
    const team1 = matchDetails?.team_1_name;
    const team2 = matchDetails?.team_2_name;
    const mapCaptures = capturesByMapData.get(mapDataId) ?? [];
    const mapPayloads = payloadsByMapData.get(mapDataId) ?? [];
    const mapPoints = pointsByMapData.get(mapDataId) ?? [];

    const winner = resolveMapWinner(storedWinnerByMapId.get(mapId), {
      matchDetails,
      finalRound,
      team1Captures: mapCaptures.filter((c) => c.capturing_team === team1),
      team2Captures: mapCaptures.filter((c) => c.capturing_team === team2),
      team1PayloadProgress: mapPayloads.filter(
        (p) => p.capturing_team === team1
      ),
      team2PayloadProgress: mapPayloads.filter(
        (p) => p.capturing_team === team2
      ),
      team1PointProgress: mapPoints.filter((p) => p.capturing_team === team1),
      team2PointProgress: mapPoints.filter((p) => p.capturing_team === team2),
    });

    result.set(mapId, winner);
  }

  return result;
}
