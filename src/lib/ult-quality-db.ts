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
import {
  buildZoneContextsForMaps,
  EMPTY_ZONE_CONTEXT,
} from "@/lib/zones/zone-context";

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

export type EngagementSourceRow = {
  match_time: number;
  attacker_name: string;
  attacker_team: string;
  victim_name: string;
  victim_team: string;
  attacker_x: number | null;
  attacker_z: number | null;
  victim_x: number | null;
  victim_z: number | null;
};

function buildEngagementEvents(
  kills: EngagementSourceRow[],
  damage: EngagementSourceRow[]
): EngagementEvent[] {
  const events: EngagementEvent[] = [];
  function push(row: EngagementSourceRow, kind: "kill" | "damage"): void {
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
  return events;
}

function clusterAndTag(
  events: EngagementEvent[],
  zonesAt: (matchTime: number) => TaggableZone[]
): EngagementWithZone[] {
  return clusterEngagements(events).map((engagement) => ({
    ...engagement,
    zoneName:
      tagZone(
        engagement.centroid.x,
        engagement.centroid.z,
        zonesAt(engagement.start)
      )?.name ?? null,
  }));
}

/** Pure path for callers that already hold the kill/damage rows and a
 * zone context (the batched positional pipelines). */
export function computeEngagementsFromEvents(
  kills: EngagementSourceRow[],
  damage: EngagementSourceRow[],
  zonesAt: (matchTime: number) => TaggableZone[]
): EngagementWithZone[] {
  return clusterAndTag(buildEngagementEvents(kills, damage), zonesAt);
}

/** Engagements are immutable once a map is parsed, and the damage fetch
 * behind them is one of the heaviest reads in the app — memoize per map.
 * The cache stores promises so concurrent requests share one in-flight
 * computation; failures evict so errors aren't cached. */
const ENGAGEMENT_CACHE_CAP = 256;
const engagementCache = new Map<number, Promise<EngagementWithZone[]>>();

function cacheEngagementPromise(
  mapDataId: number,
  pending: Promise<EngagementWithZone[]>
): void {
  engagementCache.set(mapDataId, pending);
  if (engagementCache.size > ENGAGEMENT_CACHE_CAP) {
    engagementCache.delete(engagementCache.keys().next().value!);
  }
}

/** Seed the cache with engagements another pipeline already computed
 * (e.g. the scrim positional batch), so later per-map lookups are free. */
export function primeEngagementCache(
  mapDataId: number,
  engagements: EngagementWithZone[]
): void {
  if (engagementCache.has(mapDataId)) return;
  cacheEngagementPromise(mapDataId, Promise.resolve(engagements));
}

export function getEngagementsForMapData(
  mapDataId: number
): Promise<EngagementWithZone[]> {
  const hit = engagementCache.get(mapDataId);
  if (hit !== undefined) {
    // Refresh recency (Map preserves insertion order).
    engagementCache.delete(mapDataId);
    engagementCache.set(mapDataId, hit);
    return hit;
  }
  const pending = computeEngagementsForMapData(mapDataId).catch((error) => {
    engagementCache.delete(mapDataId);
    throw error;
  });
  cacheEngagementPromise(mapDataId, pending);
  return pending;
}

/** How many maps' kill/damage rows one batched fetch may hold at once. */
const ENGAGEMENT_BATCH_CHUNK = 10;

/**
 * Batched engagement lookup: cache hits resolve from the LRU, misses load
 * chunk-wise with `MapDataId IN (...)` (2 event queries + 1 calibration
 * query per chunk) instead of 4+ queries per map. Concurrent callers
 * share in-flight chunk computations through the same promise cache.
 */
export function getEngagementsForMapDataBatch(
  mapDataIds: number[]
): Promise<Map<number, EngagementWithZone[]>> {
  const pending = new Map<number, Promise<EngagementWithZone[]>>();
  const misses: number[] = [];
  for (const id of new Set(mapDataIds)) {
    const hit = engagementCache.get(id);
    if (hit !== undefined) {
      engagementCache.delete(id);
      engagementCache.set(id, hit);
      pending.set(id, hit);
    } else {
      misses.push(id);
    }
  }

  // Chain chunks sequentially so a 50-map cold start doesn't flood the
  // pool; each chunk is only ~3 queries.
  let previousChunk: Promise<unknown> = Promise.resolve();
  for (let i = 0; i < misses.length; i += ENGAGEMENT_BATCH_CHUNK) {
    const chunk = misses.slice(i, i + ENGAGEMENT_BATCH_CHUNK);
    const chunkResult = previousChunk.then(() =>
      computeEngagementsForChunk(chunk)
    );
    previousChunk = chunkResult.catch(() => undefined);
    for (const id of chunk) {
      const perMap = chunkResult.then((byMap) => byMap.get(id) ?? []);
      perMap.catch(() => engagementCache.delete(id));
      cacheEngagementPromise(id, perMap);
      pending.set(id, perMap);
    }
  }

  return (async () => {
    const result = new Map<number, EngagementWithZone[]>();
    for (const [id, promise] of pending) {
      result.set(id, await promise);
    }
    return result;
  })();
}

async function computeEngagementsForChunk(
  mapDataIds: number[]
): Promise<Map<number, EngagementWithZone[]>> {
  const where = { MapDataId: { in: mapDataIds } };
  const select = {
    MapDataId: true,
    match_time: true,
    attacker_name: true,
    attacker_team: true,
    victim_name: true,
    victim_team: true,
    attacker_x: true,
    attacker_z: true,
    victim_x: true,
    victim_z: true,
  };
  const [kills, damage, mapDatas, roundStarts] = await Promise.all([
    prisma.kill.findMany({ where, select }),
    prisma.damage.findMany({ where, select }),
    prisma.mapData.findMany({
      where: { id: { in: mapDataIds } },
      select: { id: true, Map: { select: { name: true } } },
    }),
    prisma.roundStart.findMany({
      where,
      select: { MapDataId: true, match_time: true, objective_index: true },
      orderBy: { match_time: "asc" },
    }),
  ]);

  const killsByMap = new Map<number, EngagementSourceRow[]>();
  const damageByMap = new Map<number, EngagementSourceRow[]>();
  for (const { MapDataId, ...row } of kills) {
    if (MapDataId == null) continue;
    const list = killsByMap.get(MapDataId) ?? [];
    list.push(row);
    killsByMap.set(MapDataId, list);
  }
  for (const { MapDataId, ...row } of damage) {
    if (MapDataId == null) continue;
    const list = damageByMap.get(MapDataId) ?? [];
    list.push(row);
    damageByMap.set(MapDataId, list);
  }
  const roundStartsByMap = new Map<
    number,
    { match_time: number; objective_index: number }[]
  >();
  for (const r of roundStarts) {
    if (r.MapDataId == null) continue;
    const list = roundStartsByMap.get(r.MapDataId) ?? [];
    list.push({ match_time: r.match_time, objective_index: r.objective_index });
    roundStartsByMap.set(r.MapDataId, list);
  }
  const mapNameById = new Map(
    mapDatas.map((md) => [md.id, md.Map?.name ?? null])
  );

  const contexts = await buildZoneContextsForMaps(
    mapDataIds.map((id) => ({
      mapDataId: id,
      mapName: mapNameById.get(id) ?? null,
      roundStarts: roundStartsByMap.get(id) ?? [],
    }))
  );

  const result = new Map<number, EngagementWithZone[]>();
  for (const id of mapDataIds) {
    const zonesAt = contexts.get(id)?.zonesAt ?? EMPTY_ZONE_CONTEXT.zonesAt;
    result.set(
      id,
      computeEngagementsFromEvents(
        killsByMap.get(id) ?? [],
        damageByMap.get(id) ?? [],
        zonesAt
      )
    );
  }
  return result;
}

async function computeEngagementsForMapData(
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
  const events = buildEngagementEvents(kills, damage);
  const emptyZones: TaggableZone[] = [];
  const { zonesAt } = events.length
    ? await loadZoneContext(mapDataId)
    : { zonesAt: () => emptyZones };
  return clusterAndTag(events, zonesAt);
}
