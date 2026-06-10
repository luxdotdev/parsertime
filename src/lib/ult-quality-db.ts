import { CONTROL_OBJECTIVE_MAP } from "@/lib/map-calibration/control-map-index";
import prisma from "@/lib/prisma";
import {
  clusterEngagements,
  type Engagement,
  type EngagementEvent,
} from "@/lib/engagements";
import { tagZone } from "@/lib/zones/tag";
import {
  buildUltInstances,
  computeUltQualityStats,
  pairUltEvents,
  type UltInstance,
  type UltKill,
  type UltQualityStats,
} from "@/lib/ult-quality";
import type { TaggableZone } from "@/lib/zones/tag";

export type ZoneContext = {
  zonesAt: (matchTime: number) => TaggableZone[];
  hasPointZones: boolean;
};

function toTaggable(
  zones: {
    id: number;
    name: string;
    category: string;
    vertices: unknown;
  }[]
): TaggableZone[] {
  return zones.map((z) => ({
    id: z.id,
    name: z.name,
    category: z.category as "POINT" | "LANE",
    vertices: z.vertices as [number, number][],
  }));
}

/**
 * Published zones for a MapData's map. Control maps: one zone set per
 * sub-map, selected by the round's objective_index at the given time
 * (sub-map arenas can overlap in world space — never tag across them).
 */
export async function loadZoneContext(mapDataId: number): Promise<ZoneContext> {
  const mapData = await prisma.mapData.findUnique({
    where: { id: mapDataId },
    select: { Map: { select: { name: true } } },
  });
  const mapName = mapData?.Map?.name;
  if (!mapName) return { zonesAt: () => [], hasPointZones: false };

  const subMaps = CONTROL_OBJECTIVE_MAP[mapName];
  if (!subMaps) {
    const calibration = await prisma.mapCalibration.findUnique({
      where: { mapName },
      select: {
        zones: {
          where: { status: "PUBLISHED" },
          select: { id: true, name: true, category: true, vertices: true },
        },
      },
    });
    const zones = toTaggable(calibration?.zones ?? []);
    return {
      zonesAt: () => zones,
      hasPointZones: zones.some((z) => z.category === "POINT"),
    };
  }

  // Control: zones per objective_index, rounds assign times to indexes
  const [calibrations, roundStarts] = await Promise.all([
    prisma.mapCalibration.findMany({
      where: { mapName: { in: subMaps } },
      select: {
        mapName: true,
        zones: {
          where: { status: "PUBLISHED" },
          select: { id: true, name: true, category: true, vertices: true },
        },
      },
    }),
    prisma.roundStart.findMany({
      where: { MapDataId: mapDataId },
      select: { match_time: true, objective_index: true },
      orderBy: { match_time: "asc" },
    }),
  ]);
  const zonesByIndex = new Map<number, TaggableZone[]>();
  subMaps.forEach((subName, idx) => {
    const cal = calibrations.find((c) => c.mapName === subName);
    if (cal) zonesByIndex.set(idx, toTaggable(cal.zones));
  });
  function zonesAt(t: number): TaggableZone[] {
    let current: number | null = null;
    for (const r of roundStarts) {
      if (r.match_time <= t) current = r.objective_index;
      else break;
    }
    return current !== null ? (zonesByIndex.get(current) ?? []) : [];
  }
  const hasPointZones = [...zonesByIndex.values()].some((zones) =>
    zones.some((z) => z.category === "POINT")
  );
  return { zonesAt, hasPointZones };
}

async function loadUltEventsAndKills(mapDataId: number) {
  const [starts, ends, kills] = await Promise.all([
    prisma.ultimateStart.findMany({
      where: { MapDataId: mapDataId },
      select: {
        match_time: true,
        player_name: true,
        player_team: true,
        player_hero: true,
        ultimate_id: true,
        player_x: true,
        player_y: true,
        player_z: true,
      },
    }),
    prisma.ultimateEnd.findMany({
      where: { MapDataId: mapDataId },
      select: {
        match_time: true,
        player_name: true,
        player_team: true,
        player_hero: true,
        ultimate_id: true,
        player_x: true,
        player_y: true,
        player_z: true,
      },
    }),
    prisma.kill.findMany({
      where: { MapDataId: mapDataId },
      select: {
        match_time: true,
        attacker_name: true,
        attacker_team: true,
        victim_name: true,
        victim_team: true,
        attacker_x: true,
        attacker_y: true,
        attacker_z: true,
        victim_x: true,
        victim_y: true,
        victim_z: true,
      },
    }),
  ]);
  return { starts, ends, kills: kills as UltKill[] };
}

export async function buildUltInstancesForMapData(mapDataId: number): Promise<{
  instances: UltInstance[];
  hasPointZones: boolean;
}> {
  const { starts, ends, kills } = await loadUltEventsAndKills(mapDataId);
  const zoneContext: ZoneContext = starts.some((s) => s.player_x != null)
    ? await loadZoneContext(mapDataId)
    : { zonesAt: () => [], hasPointZones: false };
  const instances = buildUltInstances(
    pairUltEvents(starts, ends),
    kills,
    zoneContext.zonesAt
  );
  return { instances, hasPointZones: zoneContext.hasPointZones };
}

export async function getUltQualityStatsForMapData(
  mapDataId: number,
  playerName: string
): Promise<UltQualityStats> {
  const { instances, hasPointZones } =
    await buildUltInstancesForMapData(mapDataId);
  return computeUltQualityStats(instances, playerName, hasPointZones);
}

export type EngagementWithZone = Engagement & { zoneName: string | null };

export async function getEngagementsForMapData(
  mapDataId: number
): Promise<EngagementWithZone[]> {
  const [kills, damage] = await Promise.all([
    prisma.kill.findMany({
      where: { MapDataId: mapDataId },
      select: {
        match_time: true,
        attacker_name: true,
        attacker_team: true,
        victim_name: true,
        victim_team: true,
        attacker_x: true,
        attacker_z: true,
        victim_x: true,
        victim_z: true,
      },
    }),
    prisma.damage.findMany({
      where: { MapDataId: mapDataId },
      select: {
        match_time: true,
        attacker_name: true,
        attacker_team: true,
        victim_name: true,
        victim_team: true,
        attacker_x: true,
        attacker_z: true,
        victim_x: true,
        victim_z: true,
      },
    }),
  ]);
  const events: EngagementEvent[] = [];
  function push(
    row: {
      match_time: number;
      attacker_name: string;
      attacker_team: string;
      victim_name: string;
      victim_team: string;
      attacker_x: number | null;
      attacker_z: number | null;
      victim_x: number | null;
      victim_z: number | null;
    },
    kind: "kill" | "damage"
  ): void {
    const x = row.victim_x ?? row.attacker_x;
    const z = row.victim_z ?? row.attacker_z;
    if (x == null || z == null) return;
    events.push({
      match_time: row.match_time,
      x,
      z,
      kind,
      attackerTeam: row.attacker_team,
      attackerName: row.attacker_name,
      victimTeam: row.victim_team,
      victimName: row.victim_name,
    });
  }
  for (const k of kills) push(k, "kill");
  for (const d of damage) push(d, "damage");

  const engagements = clusterEngagements(events);
  const emptyZones: TaggableZone[] = [];
  const { zonesAt } = events.length
    ? await loadZoneContext(mapDataId)
    : { zonesAt: () => emptyZones };
  return engagements.map((engagement) => ({
    ...engagement,
    zoneName:
      tagZone(
        engagement.centroid.x,
        engagement.centroid.z,
        zonesAt(engagement.start)
      )?.name ?? null,
  }));
}
