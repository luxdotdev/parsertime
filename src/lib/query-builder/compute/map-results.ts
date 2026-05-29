import "server-only";

import type { ComputedRow } from "@/lib/query-builder/aggregate";
import prisma from "@/lib/prisma";
import { AppRuntime } from "@/data/runtime";
import { findTeamNameForMapInMemory } from "@/data/team/shared-core";
import { TeamSharedDataService } from "@/data/team/shared-data-service";
import { calculateWinner } from "@/lib/winrate";
import type {
  MatchStart,
  MatchEnd,
  ObjectiveCaptured,
  PayloadProgress,
  PointProgress,
  RoundEnd,
} from "@prisma/client";
import { Effect } from "effect";

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

/**
 * Emit one row per map with a computed win/loss, reusing calculateWinner() —
 * the same objective-progress / score / capture logic the scrim and map
 * dashboards use. This is the canonical "can't be done in SQL" analysis, so it
 * runs as a post-processing step over the team's scoped data.
 */
export async function computeMapResults(
  teamId: number,
  scrimIds: number[]
): Promise<ComputedRow[]> {
  const data = await AppRuntime.runPromise(
    TeamSharedDataService.pipe(
      Effect.flatMap((svc) => svc.getExtendedTeamData(teamId))
    )
  );

  const inScope = new Set(scrimIds);
  const matchStartByMap = byMap<MatchStart>(data.matchStarts);
  const roundsByMap = byMap<RoundEnd>(data.finalRounds);
  const capturesByMap = byMap<ObjectiveCaptured>(data.captures);
  const payloadByMap = byMap<PayloadProgress>(data.payloadProgresses);
  const pointByMap = byMap<PointProgress>(data.pointProgresses);
  const matchEnds = await prisma.matchEnd.findMany({
    where: { MapDataId: { in: data.mapDataIds } },
  });
  const matchEndByMap = byMap<MatchEnd>(matchEnds);

  const rows: ComputedRow[] = [];
  for (const mapDataId of data.mapDataIds) {
    const matchStart = matchStartByMap.get(mapDataId)?.[0] ?? null;
    if (!matchStart || !inScope.has(matchStart.scrimId)) continue;

    const ourTeam = findTeamNameForMapInMemory(
      mapDataId,
      data.allPlayerStats,
      data.teamRosterSet
    );
    if (!ourTeam) continue;

    const rounds = roundsByMap.get(mapDataId) ?? [];
    const finalRound =
      rounds.length > 0
        ? rounds.reduce((latest, r) =>
            r.round_number > latest.round_number ? r : latest
          )
        : null;

    const captures = capturesByMap.get(mapDataId) ?? [];
    const payload = payloadByMap.get(mapDataId) ?? [];
    const point = pointByMap.get(mapDataId) ?? [];
    const t1 = matchStart.team_1_name;
    const t2 = matchStart.team_2_name;

    const winner = calculateWinner({
      matchDetails: matchStart,
      finalRound,
      team1Captures: captures.filter((c) => c.capturing_team === t1),
      team2Captures: captures.filter((c) => c.capturing_team === t2),
      team1PayloadProgress: payload.filter((p) => p.capturing_team === t1),
      team2PayloadProgress: payload.filter((p) => p.capturing_team === t2),
      team1PointProgress: point.filter((p) => p.capturing_team === t1),
      team2PointProgress: point.filter((p) => p.capturing_team === t2),
    });
    if (winner === "N/A") continue;

    const scrim = data.mapDataRecords.find((r) => r.id === mapDataId)?.Scrim
      ?.name;
    const matchTime = matchEndByMap.get(mapDataId)?.[0]?.match_time ?? 0;
    rows.push({
      won: winner === ourTeam ? 1 : 0,
      lost: winner === ourTeam ? 0 : 1,
      result: winner === ourTeam ? "win" : "loss",
      map: matchStart.map_name,
      map_type: matchStart.map_type,
      opponent: ourTeam === t1 ? t2 : t1,
      scrim: scrim ?? "Scrim",
      playtime: matchTime,
    });
  }

  return rows;
}
