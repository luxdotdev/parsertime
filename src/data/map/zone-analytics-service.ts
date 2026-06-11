import prisma from "@/lib/prisma";
import {
  countEventsByZone,
  type ZoneCountEvent,
  type ZoneCountRow,
} from "@/lib/zones/analytics";
import { loadZoneContext } from "@/lib/ult-quality-db";

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

  const rows = countEventsByZone(events, ctx.zonesAt);
  return rows.length > 0 ? { rows } : null;
}
