import type { Prisma } from "@prisma/client";
import { CONTROL_OBJECTIVE_MAP } from "@/lib/map-calibration/control-map-index";
import prisma from "@/lib/prisma";
import {
  CONTENTION_PAD_SEC,
  GRID_CELL_SIZE_M,
  MAX_MAPDATA_POOLED,
  MIN_TOTAL_SAMPLES,
} from "@/lib/zones/constants";
import type { Vertex } from "@/lib/zones/geometry";
import {
  buildDensityGrid,
  gaussianBlur,
  type GridSample,
} from "@/lib/zones/grid";
import {
  labelLanes,
  tracePayloadPath,
  type PositionedEvent,
  type ProgressRow,
} from "@/lib/zones/label";
import { extractLanes } from "@/lib/zones/lanes";
import { extractPointPolygon } from "@/lib/zones/points";
import { buildWindows, inWindows, type TimeWindow } from "@/lib/zones/windows";

export type ClassifyResult =
  | { ok: true; pointZones: number; laneZones: number }
  | {
      ok: false;
      reason: "no_calibration" | "no_data" | "insufficient_samples";
    };

/** "Nepal: Sanctum" → { baseMapName: "Nepal", objectiveIndex: 0 } */
export function resolveCalibrationTarget(mapName: string): {
  baseMapName: string;
  objectiveIndex: number | null;
} {
  for (const [base, subs] of Object.entries(CONTROL_OBJECTIVE_MAP)) {
    const idx = subs.indexOf(mapName);
    if (idx !== -1) return { baseMapName: base, objectiveIndex: idx };
  }
  return { baseMapName: mapName, objectiveIndex: null };
}

type TimedSample = GridSample & { match_time: number; mapDataId: number };

/** Push a sample, skipping rows with missing coordinates (NULL CONTRACT). */
function pushSample(
  samples: TimedSample[],
  mapDataId: number | null,
  t: number,
  x: number | null,
  z: number | null
): void {
  if (mapDataId != null && x != null && z != null) {
    samples.push({ mapDataId, match_time: t, x, z });
  }
}

/**
 * Assign the objective index active at time `t` for a given MapData, based
 * on its round-start markers (sorted ascending by match_time).
 */
function assignObjectiveIndex(
  startsByMap: Map<number, { t: number; obj: number }[]>,
  mapDataId: number,
  t: number
): number | null {
  const list = startsByMap.get(mapDataId);
  if (!list) return null;
  let current: number | null = null;
  for (const { t: rt, obj } of list) {
    if (rt <= t) current = obj;
    else break;
  }
  return current;
}

export async function classifyZonesForCalibration(
  calibrationId: number,
  createdBy: string
): Promise<ClassifyResult> {
  const calibration = await prisma.mapCalibration.findUnique({
    where: { id: calibrationId },
  });
  if (!calibration) return { ok: false, reason: "no_calibration" };

  const { baseMapName, objectiveIndex } = resolveCalibrationTarget(
    calibration.mapName
  );

  const mapDatas = await prisma.mapData.findMany({
    where: { Map: { name: baseMapName } },
    select: { id: true },
    orderBy: { id: "desc" },
    take: MAX_MAPDATA_POOLED,
  });
  const ids = mapDatas.map((m) => m.id);
  if (ids.length === 0) return { ok: false, reason: "no_data" };

  const [
    kills,
    damage,
    healing,
    ability1,
    ability2,
    ultStarts,
    ultEnds,
    roundStarts,
    pointProgress,
    payloadProgress,
  ] = await Promise.all([
    prisma.kill.findMany({
      where: { MapDataId: { in: ids } },
      select: {
        MapDataId: true,
        match_time: true,
        attacker_x: true,
        attacker_z: true,
        victim_x: true,
        victim_z: true,
      },
    }),
    prisma.damage.findMany({
      where: { MapDataId: { in: ids } },
      select: {
        MapDataId: true,
        match_time: true,
        attacker_x: true,
        attacker_z: true,
        victim_x: true,
        victim_z: true,
      },
    }),
    prisma.healing.findMany({
      where: { MapDataId: { in: ids } },
      select: {
        MapDataId: true,
        match_time: true,
        healer_x: true,
        healer_z: true,
        healee_x: true,
        healee_z: true,
      },
    }),
    prisma.ability1Used.findMany({
      where: { MapDataId: { in: ids } },
      select: {
        MapDataId: true,
        match_time: true,
        player_x: true,
        player_z: true,
      },
    }),
    prisma.ability2Used.findMany({
      where: { MapDataId: { in: ids } },
      select: {
        MapDataId: true,
        match_time: true,
        player_x: true,
        player_z: true,
      },
    }),
    prisma.ultimateStart.findMany({
      where: { MapDataId: { in: ids } },
      select: {
        MapDataId: true,
        match_time: true,
        player_x: true,
        player_z: true,
      },
    }),
    prisma.ultimateEnd.findMany({
      where: { MapDataId: { in: ids } },
      select: {
        MapDataId: true,
        match_time: true,
        player_x: true,
        player_z: true,
      },
    }),
    prisma.roundStart.findMany({
      where: { MapDataId: { in: ids } },
      select: { MapDataId: true, match_time: true, objective_index: true },
      orderBy: { match_time: "asc" },
    }),
    prisma.pointProgress.findMany({
      where: { MapDataId: { in: ids } },
      select: { MapDataId: true, match_time: true, objective_index: true },
    }),
    prisma.payloadProgress.findMany({
      where: { MapDataId: { in: ids } },
      select: {
        MapDataId: true,
        match_time: true,
        objective_index: true,
        payload_capture_progress: true,
      },
    }),
  ]);

  // ---- pool samples (skip null coords; both endpoints of paired events)
  const samples: TimedSample[] = [];
  for (const k of kills) {
    pushSample(samples, k.MapDataId, k.match_time, k.attacker_x, k.attacker_z);
    pushSample(samples, k.MapDataId, k.match_time, k.victim_x, k.victim_z);
  }
  for (const d of damage) {
    pushSample(samples, d.MapDataId, d.match_time, d.attacker_x, d.attacker_z);
    pushSample(samples, d.MapDataId, d.match_time, d.victim_x, d.victim_z);
  }
  for (const h of healing) {
    pushSample(samples, h.MapDataId, h.match_time, h.healer_x, h.healer_z);
    pushSample(samples, h.MapDataId, h.match_time, h.healee_x, h.healee_z);
  }
  for (const a of [...ability1, ...ability2, ...ultStarts, ...ultEnds]) {
    pushSample(samples, a.MapDataId, a.match_time, a.player_x, a.player_z);
  }

  // ---- control sub-map filtering: keep only samples in rounds for this
  // objective index (roundStarts are per MapData, sorted by match_time)
  let pooled = samples;
  if (objectiveIndex !== null) {
    const startsByMap = new Map<number, { t: number; obj: number }[]>();
    for (const r of roundStarts) {
      if (r.MapDataId == null) continue;
      const list = startsByMap.get(r.MapDataId) ?? [];
      list.push({ t: r.match_time, obj: r.objective_index });
      startsByMap.set(r.MapDataId, list);
    }
    pooled = samples.filter(
      (s) =>
        assignObjectiveIndex(startsByMap, s.mapDataId, s.match_time) ===
        objectiveIndex
    );
  }

  if (pooled.length < MIN_TOTAL_SAMPLES) {
    return { ok: false, reason: "insufficient_samples" };
  }

  // ---- POINT proposals: per objective_index seen in pointProgress
  const pointZones: { name: string; vertices: Vertex[] }[] = [];
  const objectiveIndexes =
    objectiveIndex !== null
      ? [objectiveIndex]
      : [...new Set(pointProgress.map((p) => p.objective_index))].sort(
          (a, b) => a - b
        );
  for (const objIdx of objectiveIndexes) {
    const windowsByMap = new Map<number, TimeWindow[]>();
    const timesByMap = new Map<number, number[]>();
    for (const p of pointProgress) {
      if (p.MapDataId == null || p.objective_index !== objIdx) continue;
      const list = timesByMap.get(p.MapDataId) ?? [];
      list.push(p.match_time);
      timesByMap.set(p.MapDataId, list);
    }
    for (const [mapId, times] of timesByMap) {
      windowsByMap.set(mapId, buildWindows(times, CONTENTION_PAD_SEC));
    }
    const contention = pooled.filter((s) => {
      const windows = windowsByMap.get(s.mapDataId);
      return windows ? inWindows(s.match_time, windows) : false;
    });
    const polygon = extractPointPolygon(contention);
    if (polygon) {
      pointZones.push({
        name: objectiveIndexes.length > 1 ? `Point ${objIdx + 1}` : "Point",
        vertices: polygon,
      });
    }
  }

  // ---- LANE proposals
  const grid = gaussianBlur(buildDensityGrid(pooled, GRID_CELL_SIZE_M));
  const lanes = extractLanes(grid);
  const progressRows: ProgressRow[] = payloadProgress
    .filter((p) => p.MapDataId != null)
    .map((p) => ({
      match_time: p.match_time,
      mapDataId: p.MapDataId!,
      objective_index: p.objective_index,
      progress: p.payload_capture_progress,
    }));
  const fightEvents: PositionedEvent[] = pooled;
  const path =
    progressRows.length > 0 ? tracePayloadPath(fightEvents, progressRows) : [];
  const roles = labelLanes(lanes, path);

  // ---- write proposals: replace DRAFT+AUTO only; never touch PUBLISHED
  let flankCount = 0;
  let laneCount = 0;
  const zoneRows = [
    ...pointZones.map((z) => ({
      calibrationId,
      name: z.name,
      category: "POINT" as const,
      status: "DRAFT" as const,
      source: "AUTO" as const,
      laneRole: null,
      vertices: z.vertices as unknown as Prisma.InputJsonValue,
      createdBy,
    })),
    ...lanes.map((lane, i) => {
      const role = roles[i];
      const name =
        role === "MAIN"
          ? "Main"
          : role === "FLANK"
            ? `Flank ${++flankCount}`
            : `Lane ${++laneCount}`;
      return {
        calibrationId,
        name,
        category: "LANE" as const,
        status: "DRAFT" as const,
        source: "AUTO" as const,
        laneRole: role,
        vertices: lane.polygon as unknown as Prisma.InputJsonValue,
        createdBy,
      };
    }),
  ];

  await prisma.$transaction([
    prisma.mapZone.deleteMany({
      where: { calibrationId, status: "DRAFT", source: "AUTO" },
    }),
    prisma.mapZone.createMany({ data: zoneRows }),
  ]);

  return { ok: true, pointZones: pointZones.length, laneZones: lanes.length };
}
