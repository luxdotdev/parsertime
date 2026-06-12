import prisma from "@/lib/prisma";

/** Field superset across the engagement, zone, and route pipelines. */
export type PositionalKillRow = {
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

export type PositionalDamageRow = PositionalKillRow;

export type PositionalHealingRow = {
  match_time: number;
  healer_name: string;
  healer_team: string;
  healer_x: number | null;
  healer_z: number | null;
  healee_name: string;
  healee_team: string;
  healee_x: number | null;
  healee_z: number | null;
};

export type PositionalPlayerEventRow = {
  match_time: number;
  player_name: string;
  player_team: string;
  player_x: number | null;
  player_z: number | null;
};

export type PositionalEventBundle = {
  /** The Map relation name — the zone-calibration key. */
  mapName: string | null;
  kills: PositionalKillRow[];
  damage: PositionalDamageRow[];
  healing: PositionalHealingRow[];
  ability1: PositionalPlayerEventRow[];
  ability2: PositionalPlayerEventRow[];
  ultStarts: PositionalPlayerEventRow[];
  ultEnds: PositionalPlayerEventRow[];
  objectiveUpdated: { match_time: number; round_number: number }[];
  objectiveCaptured: { match_time: number; capturing_team: string }[];
  roundStarts: {
    match_time: number;
    round_number: number;
    objective_index: number;
  }[];
  roundEnds: {
    match_time: number;
    round_number: number;
    team_1_score: number;
    team_2_score: number;
  }[];
  matchStart: {
    team_1_name: string;
    team_2_name: string;
    map_name: string;
    map_type: string;
  } | null;
};

/** Damage/healing rows are the heaviest reads in the app; cap how many
 * maps' worth sit in one query result so a long scrim window can't blow
 * the function's memory. Chunks load sequentially for pool politeness. */
const BUNDLE_CHUNK_SIZE = 10;

function emptyBundle(mapName: string | null): PositionalEventBundle {
  return {
    mapName,
    kills: [],
    damage: [],
    healing: [],
    ability1: [],
    ability2: [],
    ultStarts: [],
    ultEnds: [],
    objectiveUpdated: [],
    objectiveCaptured: [],
    roundStarts: [],
    roundEnds: [],
    matchStart: null,
  };
}

function groupRows<T extends { MapDataId: number | null }>(
  rows: T[]
): Map<number, Omit<T, "MapDataId">[]> {
  const byMap = new Map<number, Omit<T, "MapDataId">[]>();
  for (const { MapDataId, ...rest } of rows) {
    if (MapDataId == null) continue;
    const list = byMap.get(MapDataId) ?? [];
    list.push(rest);
    byMap.set(MapDataId, list);
  }
  return byMap;
}

async function loadChunk(
  mapDataIds: number[],
  result: Map<number, PositionalEventBundle>
): Promise<void> {
  const where = { MapDataId: { in: mapDataIds } };
  const [
    mapDatas,
    kills,
    damage,
    healing,
    ability1,
    ability2,
    ultStarts,
    ultEnds,
    objectiveUpdated,
    objectiveCaptured,
    roundStarts,
    roundEnds,
    matchStarts,
  ] = await Promise.all([
    prisma.mapData.findMany({
      where: { id: { in: mapDataIds } },
      select: { id: true, Map: { select: { name: true } } },
    }),
    prisma.kill.findMany({
      where,
      select: {
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
      },
    }),
    prisma.damage.findMany({
      where,
      select: {
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
      },
    }),
    prisma.healing.findMany({
      where,
      select: {
        MapDataId: true,
        match_time: true,
        healer_name: true,
        healer_team: true,
        healer_x: true,
        healer_z: true,
        healee_name: true,
        healee_team: true,
        healee_x: true,
        healee_z: true,
      },
    }),
    prisma.ability1Used.findMany({
      where,
      select: {
        MapDataId: true,
        match_time: true,
        player_name: true,
        player_team: true,
        player_x: true,
        player_z: true,
      },
    }),
    prisma.ability2Used.findMany({
      where,
      select: {
        MapDataId: true,
        match_time: true,
        player_name: true,
        player_team: true,
        player_x: true,
        player_z: true,
      },
    }),
    prisma.ultimateStart.findMany({
      where,
      select: {
        MapDataId: true,
        match_time: true,
        player_name: true,
        player_team: true,
        player_x: true,
        player_z: true,
      },
    }),
    prisma.ultimateEnd.findMany({
      where,
      select: {
        MapDataId: true,
        match_time: true,
        player_name: true,
        player_team: true,
        player_x: true,
        player_z: true,
      },
    }),
    prisma.objectiveUpdated.findMany({
      where,
      select: { MapDataId: true, match_time: true, round_number: true },
      orderBy: { match_time: "asc" },
    }),
    prisma.objectiveCaptured.findMany({
      where,
      select: { MapDataId: true, match_time: true, capturing_team: true },
      orderBy: { match_time: "asc" },
    }),
    prisma.roundStart.findMany({
      where,
      select: {
        MapDataId: true,
        match_time: true,
        round_number: true,
        objective_index: true,
      },
      orderBy: { match_time: "asc" },
    }),
    prisma.roundEnd.findMany({
      where,
      select: {
        MapDataId: true,
        match_time: true,
        round_number: true,
        team_1_score: true,
        team_2_score: true,
      },
    }),
    prisma.matchStart.findMany({
      where,
      select: {
        MapDataId: true,
        team_1_name: true,
        team_2_name: true,
        map_name: true,
        map_type: true,
      },
    }),
  ]);

  const mapNameById = new Map(mapDatas.map((md) => [md.id, md.Map?.name ?? null]));
  const killsByMap = groupRows(kills);
  const damageByMap = groupRows(damage);
  const healingByMap = groupRows(healing);
  const ability1ByMap = groupRows(ability1);
  const ability2ByMap = groupRows(ability2);
  const ultStartsByMap = groupRows(ultStarts);
  const ultEndsByMap = groupRows(ultEnds);
  const objectiveUpdatedByMap = groupRows(objectiveUpdated);
  const objectiveCapturedByMap = groupRows(objectiveCaptured);
  const roundStartsByMap = groupRows(roundStarts);
  const roundEndsByMap = groupRows(roundEnds);
  const matchStartByMap = new Map<
    number,
    NonNullable<PositionalEventBundle["matchStart"]>
  >();
  for (const { MapDataId, ...rest } of matchStarts) {
    if (MapDataId == null || matchStartByMap.has(MapDataId)) continue;
    matchStartByMap.set(MapDataId, rest);
  }

  for (const id of mapDataIds) {
    const bundle = emptyBundle(mapNameById.get(id) ?? null);
    bundle.kills = killsByMap.get(id) ?? [];
    bundle.damage = damageByMap.get(id) ?? [];
    bundle.healing = healingByMap.get(id) ?? [];
    bundle.ability1 = ability1ByMap.get(id) ?? [];
    bundle.ability2 = ability2ByMap.get(id) ?? [];
    bundle.ultStarts = ultStartsByMap.get(id) ?? [];
    bundle.ultEnds = ultEndsByMap.get(id) ?? [];
    bundle.objectiveUpdated = objectiveUpdatedByMap.get(id) ?? [];
    bundle.objectiveCaptured = objectiveCapturedByMap.get(id) ?? [];
    bundle.roundStarts = roundStartsByMap.get(id) ?? [];
    bundle.roundEnds = roundEndsByMap.get(id) ?? [];
    bundle.matchStart = matchStartByMap.get(id) ?? null;
    result.set(id, bundle);
  }
}

/**
 * Every positional event table for a set of maps, fetched once per table
 * with `MapDataId IN (...)` and partitioned in memory. Replaces the
 * per-map query battery (engagements + zones + routes issued ~20 queries
 * per map) that starved the connection pool on cold team dashboards.
 * Time-ordered tables stay ascending within each map.
 */
export async function loadPositionalEventBundles(
  mapDataIds: number[]
): Promise<Map<number, PositionalEventBundle>> {
  const result = new Map<number, PositionalEventBundle>();
  const unique = [...new Set(mapDataIds)];
  for (let i = 0; i < unique.length; i += BUNDLE_CHUNK_SIZE) {
    await loadChunk(unique.slice(i, i + BUNDLE_CHUNK_SIZE), result);
  }
  return result;
}
