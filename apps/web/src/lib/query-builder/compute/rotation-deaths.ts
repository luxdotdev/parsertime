import "server-only";

import type { ComputedRow } from "@/lib/query-builder/aggregate";
import { buildMapMeta, getTeamData } from "@/lib/query-builder/compute/shared";
import prisma from "@/lib/prisma";
import {
  detectRotationDeaths,
  type DamageEvent,
} from "@/lib/replay/rotation-death-detection";
import { groupEventsIntoFights, mercyRezToKillEvent } from "@/lib/utils";
import type { Kill } from "@/generated/prisma/client";

type DamageRow = DamageEvent & { MapDataId: number | null };

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

function sideFor(team: string, ourTeam: string): "us" | "enemy" {
  return team === ourTeam ? "us" : "enemy";
}

/**
 * Emit one row per non-skippable death with rotation-death signals attached.
 * This is the queryable form of the map analysis rotation-deaths card: a death
 * becomes a rotation death when it is very early in a fight and has little
 * cross-team damage in the pre-fight window.
 */
export async function computeRotationDeaths(
  teamId: number,
  scrimIds: number[]
): Promise<ComputedRow[]> {
  if (scrimIds.length === 0) return [];

  const data = await getTeamData(teamId);
  const meta = buildMapMeta(data);
  const inScope = new Set(scrimIds);
  const scopedMapIds = data.mapDataIds.filter((mapDataId) => {
    const m = meta.get(mapDataId);
    return m ? inScope.has(m.scrimId) : false;
  });
  if (scopedMapIds.length === 0) return [];

  const damage = await prisma.damage.findMany({
    where: { MapDataId: { in: scopedMapIds } },
    select: {
      match_time: true,
      attacker_team: true,
      victim_team: true,
      MapDataId: true,
    },
    orderBy: [{ MapDataId: "asc" }, { match_time: "asc" }],
  });

  const killsByMap = byMap<Kill>(data.allKills);
  const rezzesByMap = byMap(data.allRezzes);
  const damageByMap = byMap<DamageRow>(damage);

  const rows: ComputedRow[] = [];
  for (const mapDataId of scopedMapIds) {
    const m = meta.get(mapDataId);
    if (!m?.ourTeam) continue;
    const ourTeam = m.ourTeam;

    const killRows = killsByMap.get(mapDataId) ?? [];
    const fightEvents = [
      ...killRows,
      ...(rezzesByMap.get(mapDataId) ?? []).map(mercyRezToKillEvent),
    ].sort((a, b) => a.match_time - b.match_time);
    if (fightEvents.length === 0) continue;

    const fights = groupEventsIntoFights(fightEvents);
    const damageEvents = (damageByMap.get(mapDataId) ?? []).map((row) => ({
      match_time: row.match_time,
      attacker_team: row.attacker_team,
      victim_team: row.victim_team,
    }));

    for (const result of detectRotationDeaths(fights, damageEvents)) {
      const kill = result.kill;
      const victimSide = sideFor(kill.victim_team, ourTeam);
      const attackerSide = sideFor(kill.attacker_team, ourTeam);
      const isRotationDeath = result.isRotationDeath ? 1 : 0;

      rows.push({
        rotation_death: isRotationDeath,
        death_type: result.isRotationDeath ? "rotation" : "normal",
        early_in_fight: result.signals.isEarlyInFight ? 1 : 0,
        low_pre_fight_damage: result.signals.lowPreFightDamage ? 1 : 0,
        player: kill.victim_name,
        hero: kill.victim_hero,
        side: victimSide,
        victim_team: kill.victim_team,
        attacker: kill.attacker_name,
        attacker_hero: kill.attacker_hero,
        attacker_side: attackerSide,
        attacker_team: kill.attacker_team,
        pre_fight_damage_count: result.preFightDamageCount,
        kill_distance: result.killDistance,
        kill_index_in_fight: result.killIndexInFight,
        fight_index: result.fightIndex,
        map: m.map,
        map_type: m.mapType,
        scrim: m.scrim,
      });
    }
  }

  return rows;
}
