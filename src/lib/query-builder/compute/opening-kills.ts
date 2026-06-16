import "server-only";

import type { ComputedRow } from "@/lib/query-builder/aggregate";
import { analyzeFightOutcome } from "@/data/team/fight-stats-service";
import { buildMapMeta, getTeamData } from "@/lib/query-builder/compute/shared";
import {
  groupEventsIntoFights,
  mercyRezToKillEvent,
  ultimateStartToKillEvent,
} from "@/lib/utils";
import type { Kill } from "@/generated/prisma/client";

type FightEvent = Kill & { ultimate_id?: number };

function pushEvent(
  byMap: Map<number, FightEvent[]>,
  mapDataId: number | null,
  event: FightEvent
) {
  if (mapDataId == null) return;
  const bucket = byMap.get(mapDataId);
  if (bucket) bucket.push(event);
  else byMap.set(mapDataId, [event]);
}

function sideFor(team: string, ourTeam: string): "us" | "enemy" {
  return team === ourTeam ? "us" : "enemy";
}

/**
 * Emit one row per fight's first actual kill. This turns the teamfight
 * first-pick/first-death post-processing into an attribution surface: the
 * victim, attacker, heroes, sides, map, and fight result can all be grouped or
 * filtered independently by the generic query builder.
 */
export async function computeOpeningKills(
  teamId: number,
  scrimIds: number[]
): Promise<ComputedRow[]> {
  if (scrimIds.length === 0) return [];

  const data = await getTeamData(teamId);
  const meta = buildMapMeta(data);
  const inScope = new Set(scrimIds);

  const byMap = new Map<number, FightEvent[]>();
  for (const kill of data.allKills) pushEvent(byMap, kill.MapDataId, kill);
  for (const rez of data.allRezzes) {
    pushEvent(byMap, rez.MapDataId, mercyRezToKillEvent(rez));
  }
  for (const ult of data.allUltimates) {
    pushEvent(byMap, ult.MapDataId, {
      ...ultimateStartToKillEvent(ult),
      ultimate_id: ult.ultimate_id,
    });
  }

  const rows: ComputedRow[] = [];
  for (const [mapDataId, events] of byMap) {
    const m = meta.get(mapDataId);
    if (!m?.ourTeam || !inScope.has(m.scrimId)) continue;

    const sortedEvents = events.sort((a, b) => a.match_time - b.match_time);
    const fights = groupEventsIntoFights(sortedEvents);

    for (let fightIndex = 0; fightIndex < fights.length; fightIndex++) {
      const fight = fights[fightIndex];
      const firstKill = fight.kills
        .sort((a, b) => a.match_time - b.match_time)
        .find((event) => event.event_type === "kill");
      if (!firstKill) continue;

      const analysis = analyzeFightOutcome(
        { events: fight.kills, start: fight.start, end: fight.end },
        m.ourTeam
      );
      const victimSide = sideFor(firstKill.victim_team, m.ourTeam);
      const attackerSide = sideFor(firstKill.attacker_team, m.ourTeam);

      rows.push({
        first_event: 1,
        first_death: victimSide === "us" ? 1 : 0,
        first_pick: attackerSide === "us" ? 1 : 0,
        won: analysis.won ? 1 : 0,
        lost: analysis.won ? 0 : 1,
        result: analysis.won ? "win" : "loss",
        player: firstKill.victim_name,
        hero: firstKill.victim_hero,
        side: victimSide,
        victim_team: firstKill.victim_team,
        attacker: firstKill.attacker_name,
        attacker_hero: firstKill.attacker_hero,
        attacker_side: attackerSide,
        attacker_team: firstKill.attacker_team,
        kill_time: firstKill.match_time,
        fight_time: firstKill.match_time - fight.start,
        fight_index: fightIndex,
        map: m.map,
        map_type: m.mapType,
        scrim: m.scrim,
      });
    }
  }

  return rows;
}
