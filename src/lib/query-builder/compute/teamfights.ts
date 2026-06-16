import "server-only";

import type { ComputedRow } from "@/lib/query-builder/aggregate";
import { AppRuntime } from "@/data/runtime";
import { analyzeFightOutcome } from "@/data/team/fight-stats-service";
import { findTeamNameForMapInMemory } from "@/data/team/shared-core";
import { TeamSharedDataService } from "@/data/team/shared-data-service";
import {
  groupEventsIntoFights,
  mercyRezToKillEvent,
  ultimateStartToKillEvent,
} from "@/lib/utils";
import type { Kill } from "@/generated/prisma/client";
import { Effect } from "effect";

type FightEvent = Kill & { ultimate_id?: number };

function yesNo(value: boolean): "yes" | "no" {
  return value ? "yes" : "no";
}

/**
 * Emit one row per teamfight for a team, scoped to the given scrims. Each row
 * carries the computed fight attributes (winner, ultimates spent, tempo) plus
 * the map type and scrim, ready for the generic in-memory aggregator. The fight
 * detection and win/ult logic reuse the same functions the scrim and team
 * dashboards use, so the numbers match the rest of the product.
 */
export async function computeTeamfights(
  teamId: number,
  scrimIds: number[]
): Promise<ComputedRow[]> {
  const data = await AppRuntime.runPromise(
    TeamSharedDataService.pipe(
      Effect.flatMap((svc) => svc.getExtendedTeamData(teamId))
    )
  );

  const inScope = new Set(scrimIds);

  // scrimId per map, derived from kill rows (always carry scrimId) so the
  // time-scope filter is reliable even when the Scrim relation isn't loaded.
  const scrimByMap = new Map<number, number>();
  for (const kill of data.allKills) {
    if (kill.MapDataId != null && !scrimByMap.has(kill.MapDataId)) {
      scrimByMap.set(kill.MapDataId, kill.scrimId);
    }
  }

  // Per-map lookups: which in-game team is ours, the map type, and the scrim.
  const mapMeta = new Map<
    number,
    {
      ourTeam: string | null;
      map: string;
      mapType: string;
      scrim: string;
      scrimId: number;
    }
  >();
  for (const record of data.mapDataRecords) {
    mapMeta.set(record.id, {
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
    const meta = mapMeta.get(ms.MapDataId);
    if (meta) {
      meta.map = ms.map_name;
      meta.mapType = ms.map_type;
    }
  }

  // Bucket raw events by map.
  const byMap = new Map<number, FightEvent[]>();
  function push(mapDataId: number | null, event: FightEvent) {
    if (mapDataId == null) return;
    const bucket = byMap.get(mapDataId);
    if (bucket) bucket.push(event);
    else byMap.set(mapDataId, [event]);
  }
  for (const kill of data.allKills) push(kill.MapDataId, kill);
  for (const rez of data.allRezzes)
    push(rez.MapDataId, mercyRezToKillEvent(rez));
  for (const ult of data.allUltimates) {
    push(ult.MapDataId, {
      ...ultimateStartToKillEvent(ult),
      ultimate_id: ult.ultimate_id,
    });
  }

  const rows: ComputedRow[] = [];
  for (const [mapDataId, events] of byMap) {
    const meta = mapMeta.get(mapDataId);
    if (!meta?.ourTeam || !inScope.has(meta.scrimId)) continue;

    events.sort((a, b) => a.match_time - b.match_time);
    const fights = groupEventsIntoFights(events);

    for (const fight of fights) {
      const analysis = analyzeFightOutcome(
        { events: fight.kills, start: fight.start, end: fight.end },
        meta.ourTeam
      );
      rows.push({
        won: analysis.won ? 1 : 0,
        lost: analysis.won ? 0 : 1,
        duration: fight.end - fight.start,
        ults_used: analysis.ultCount,
        won_ults_used: analysis.won ? analysis.ultCount : 0,
        lost_ults_used: analysis.won ? 0 : analysis.ultCount,
        wasted_ults: analysis.wastedUlts,
        first_pick_value: analysis.hadFirstPick ? 1 : 0,
        first_death_value: analysis.hadFirstDeath ? 1 : 0,
        first_ult_value: analysis.usedFirstUlt ? 1 : 0,
        dry_fight_value: analysis.isDryFight ? 1 : 0,
        reversal_value: analysis.isReversal ? 1 : 0,
        dry_reversal_value: analysis.isDryFight && analysis.isReversal ? 1 : 0,
        non_dry_fight_value: analysis.isDryFight ? 0 : 1,
        non_dry_reversal_value:
          !analysis.isDryFight && analysis.isReversal ? 1 : 0,
        result: analysis.won ? "win" : "loss",
        first_pick: yesNo(analysis.hadFirstPick),
        first_death: yesNo(analysis.hadFirstDeath),
        first_ult: yesNo(analysis.usedFirstUlt),
        dry_fight: yesNo(analysis.isDryFight),
        reversal: yesNo(analysis.isReversal),
        map: meta.map,
        map_type: meta.mapType,
        scrim: meta.scrim,
      });
    }
  }

  return rows;
}
