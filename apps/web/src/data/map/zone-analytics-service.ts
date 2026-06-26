import prisma from "@/lib/prisma";
import {
  countEventsByZone,
  type ZoneCountEvent,
  type ZoneCountRow,
} from "@/lib/zones/analytics";
import { loadZoneContext } from "@/lib/ult-quality-db";
import type { TaggableZone } from "@/lib/zones/tag";

export type ZoneKillRow = {
  match_time: number;
  attacker_team: string;
  victim_team: string;
  attacker_x: number | null;
  attacker_z: number | null;
  victim_x: number | null;
  victim_z: number | null;
};

export type ZoneUltRow = {
  match_time: number;
  player_team: string;
  player_x: number | null;
  player_z: number | null;
};

/** Pure path for callers that already hold the event rows and a zone
 * context (the batched positional pipelines). */
export function buildZoneRowsFromEvents(
  kills: ZoneKillRow[],
  ults: ZoneUltRow[],
  zonesAt: (matchTime: number) => TaggableZone[]
): { rows: ZoneCountRow[] } | null {
  const events: ZoneCountEvent[] = [];
  for (const k of kills) {
    events.push({
      t: k.match_time,
      x: k.attacker_x,
      z: k.attacker_z,
      team: k.attacker_team,
      kind: "kill",
    });
    events.push({
      t: k.match_time,
      x: k.victim_x,
      z: k.victim_z,
      team: k.victim_team,
      kind: "death",
    });
  }
  for (const u of ults) {
    events.push({
      t: u.match_time,
      x: u.player_x,
      z: u.player_z,
      team: u.player_team,
      kind: "ult",
    });
  }

  const rows = countEventsByZone(events, zonesAt);
  return rows.length > 0 ? { rows } : null;
}

export async function buildZoneAnalyticsForMapData(
  mapDataId: number
): Promise<{ rows: ZoneCountRow[] } | null> {
  const ctx = await loadZoneContext(mapDataId);

  const [kills, ults] = await Promise.all([
    prisma.kill.findMany({
      where: { MapDataId: mapDataId },
      select: {
        match_time: true,
        attacker_team: true,
        victim_team: true,
        attacker_x: true,
        attacker_z: true,
        victim_x: true,
        victim_z: true,
      },
    }),
    prisma.ultimateStart.findMany({
      where: { MapDataId: mapDataId },
      select: {
        match_time: true,
        player_team: true,
        player_x: true,
        player_z: true,
      },
    }),
  ]);

  return buildZoneRowsFromEvents(kills, ults, ctx.zonesAt);
}
