import "server-only";

import { AppRuntime } from "@/data/runtime";
import {
  findTeamNameForMapInMemory,
  type ExtendedTeamData,
} from "@/data/team/shared-core";
import { TeamSharedDataService } from "@/data/team/shared-data-service";
import { Effect } from "effect";

export type MapMeta = {
  ourTeam: string | null;
  map: string;
  mapType: string;
  scrim: string;
  scrimId: number;
};

/** Fetch the team's extended data (roster, kills, rezzes, ultimates, ...). */
export function getTeamData(teamId: number): Promise<ExtendedTeamData> {
  return AppRuntime.runPromise(
    TeamSharedDataService.pipe(
      Effect.flatMap((svc) => svc.getExtendedTeamData(teamId))
    )
  );
}

/**
 * Per-map metadata shared by every computed analysis: which in-game team is
 * ours, the map type, the scrim name, and the scrim id (derived from kills so
 * scoping is reliable even when the Scrim relation isn't loaded).
 */
export function buildMapMeta(data: ExtendedTeamData): Map<number, MapMeta> {
  const scrimByMap = new Map<number, number>();
  for (const kill of data.allKills) {
    if (kill.MapDataId != null && !scrimByMap.has(kill.MapDataId)) {
      scrimByMap.set(kill.MapDataId, kill.scrimId);
    }
  }

  const meta = new Map<number, MapMeta>();
  for (const record of data.mapDataRecords) {
    meta.set(record.id, {
      ourTeam: findTeamNameForMapInMemory(
        record.id,
        data.allPlayerStats,
        data.teamRosterSet
      ),
      map: record.name ?? "Unknown",
      mapType: "Unknown",
      scrim: record.Scrim?.name ?? "Scrim",
      scrimId: record.Scrim?.id ?? scrimByMap.get(record.id) ?? -1,
    });
  }
  for (const ms of data.matchStarts) {
    if (ms.MapDataId == null) continue;
    const m = meta.get(ms.MapDataId);
    if (m) {
      m.map = ms.map_name;
      m.mapType = ms.map_type;
    }
  }
  return meta;
}
