import "server-only";

import {
  detectRotationDeaths,
  summarizeByPlayer,
  type DamageEvent,
  type NearbyPlayer,
  type RotationDeathAnalysis,
} from "@/lib/replay/rotation-death-detection";
import { resolveMapDataId } from "@/lib/map-data-resolver";
import { groupEventsIntoFights, mercyRezToKillEvent } from "@/lib/utils";
import prisma from "@/lib/prisma";
import { cache } from "react";

type PositionEvent = {
  match_time: number;
  playerName: string;
  playerTeam: string;
  hero: string;
  x: number;
  z: number;
};

const NEARBY_WINDOW_SEC = 10;

function findNearbyPlayers(
  killTime: number,
  attackerName: string,
  victimName: string,
  positionEvents: PositionEvent[]
): NearbyPlayer[] {
  const windowStart = killTime - NEARBY_WINDOW_SEC;
  const closest = new Map<string, { player: NearbyPlayer; dt: number }>();

  let lo = 0;
  let hi = positionEvents.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (positionEvents[mid].match_time < windowStart) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }

  for (let i = lo; i < positionEvents.length; i++) {
    const e = positionEvents[i];
    if (e.match_time > killTime) break;
    if (e.playerName === attackerName || e.playerName === victimName) continue;

    const key = `${e.playerName}::${e.playerTeam}`;
    const dt = killTime - e.match_time;
    const existing = closest.get(key);
    if (!existing || dt < existing.dt) {
      closest.set(key, {
        player: {
          playerName: e.playerName,
          playerTeam: e.playerTeam,
          hero: e.hero,
          x: e.x,
          z: e.z,
        },
        dt,
      });
    }
  }

  return Array.from(closest.values()).map((v) => v.player);
}

function pushPos(
  arr: PositionEvent[],
  matchTime: number,
  name: string,
  team: string,
  hero: string,
  x: number | null,
  z: number | null
) {
  if (x != null && z != null) {
    arr.push({
      match_time: matchTime,
      playerName: name,
      playerTeam: team,
      hero,
      x,
      z,
    });
  }
}

export const getRotationDeathAnalysis = cache(
  async (mapDataId: number): Promise<RotationDeathAnalysis | null> => {
    const resolvedId = await resolveMapDataId(mapDataId);
    const [kills, mercyRezzes, damage] = await Promise.all([
      prisma.kill.findMany({ where: { MapDataId: resolvedId } }),
      prisma.mercyRez.findMany({ where: { MapDataId: resolvedId } }),
      prisma.damage.findMany({
        where: { MapDataId: resolvedId },
        select: {
          match_time: true,
          attacker_name: true,
          attacker_team: true,
          attacker_hero: true,
          attacker_x: true,
          attacker_z: true,
          victim_name: true,
          victim_team: true,
          victim_hero: true,
          victim_x: true,
          victim_z: true,
        },
        orderBy: { match_time: "asc" },
      }),
    ]);

    if (kills.length === 0) return null;

    const damageEvents: DamageEvent[] = damage;

    const fightEvents = [
      ...kills,
      ...mercyRezzes.map(mercyRezToKillEvent),
    ].sort((a, b) => a.match_time - b.match_time);

    const fights = groupEventsIntoFights(fightEvents);
    const results = detectRotationDeaths(fights, damageEvents);
    const rotationDeaths = results.filter((r) => r.isRotationDeath);

    if (rotationDeaths.length > 0) {
      const [healing, ability1, ability2] = await Promise.all([
        prisma.healing.findMany({
          where: { MapDataId: resolvedId },
          select: {
            match_time: true,
            healer_name: true,
            healer_team: true,
            healer_hero: true,
            healer_x: true,
            healer_z: true,
            healee_name: true,
            healee_team: true,
            healee_hero: true,
            healee_x: true,
            healee_z: true,
          },
        }),
        prisma.ability1Used.findMany({
          where: { MapDataId: resolvedId },
          select: {
            match_time: true,
            player_name: true,
            player_team: true,
            player_hero: true,
            player_x: true,
            player_z: true,
          },
        }),
        prisma.ability2Used.findMany({
          where: { MapDataId: resolvedId },
          select: {
            match_time: true,
            player_name: true,
            player_team: true,
            player_hero: true,
            player_x: true,
            player_z: true,
          },
        }),
      ]);

      const positionEvents: PositionEvent[] = [];

      for (const d of damage) {
        pushPos(
          positionEvents,
          d.match_time,
          d.attacker_name,
          d.attacker_team,
          d.attacker_hero,
          d.attacker_x,
          d.attacker_z
        );
        pushPos(
          positionEvents,
          d.match_time,
          d.victim_name,
          d.victim_team,
          d.victim_hero,
          d.victim_x,
          d.victim_z
        );
      }
      for (const k of kills) {
        pushPos(
          positionEvents,
          k.match_time,
          k.attacker_name,
          k.attacker_team,
          k.attacker_hero,
          k.attacker_x,
          k.attacker_z
        );
        pushPos(
          positionEvents,
          k.match_time,
          k.victim_name,
          k.victim_team,
          k.victim_hero,
          k.victim_x,
          k.victim_z
        );
      }
      for (const h of healing) {
        pushPos(
          positionEvents,
          h.match_time,
          h.healer_name,
          h.healer_team,
          h.healer_hero,
          h.healer_x,
          h.healer_z
        );
        pushPos(
          positionEvents,
          h.match_time,
          h.healee_name,
          h.healee_team,
          h.healee_hero,
          h.healee_x,
          h.healee_z
        );
      }
      for (const a of ability1) {
        pushPos(
          positionEvents,
          a.match_time,
          a.player_name,
          a.player_team,
          a.player_hero,
          a.player_x,
          a.player_z
        );
      }
      for (const a of ability2) {
        pushPos(
          positionEvents,
          a.match_time,
          a.player_name,
          a.player_team,
          a.player_hero,
          a.player_x,
          a.player_z
        );
      }

      positionEvents.sort((a, b) => a.match_time - b.match_time);

      for (const rd of rotationDeaths) {
        rd.nearbyPlayers = findNearbyPlayers(
          rd.kill.match_time,
          rd.kill.attacker_name,
          rd.kill.victim_name,
          positionEvents
        );
      }
    }

    return {
      mapDataId,
      rotationDeaths,
      totalKills: kills.length,
      totalFights: fights.length,
      playerSummaries: summarizeByPlayer(results),
    };
  }
);
