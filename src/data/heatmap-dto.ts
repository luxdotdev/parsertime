import {
  getControlSubMapName,
  getControlSubMapNames,
  isControlMap,
} from "@/lib/map-calibration/control-map-index";
import type { MapTransform } from "@/lib/map-calibration/types";
import { worldToImage } from "@/lib/map-calibration/world-to-image";
import prisma from "@/lib/prisma";
import { r2 } from "@/lib/r2";
import { $Enums } from "@prisma/client";

type Point = { u: number; v: number };

export type HeatmapSubMap = {
  subMapName: string;
  calibrationMapName: string;
  imagePresignedUrl: string;
  imageWidth: number;
  imageHeight: number;
  damagePoints: Point[];
  healingPoints: Point[];
  killPoints: Point[];
};

export type HeatmapData =
  | { type: "single"; subMap: HeatmapSubMap }
  | { type: "control"; subMaps: HeatmapSubMap[] }
  | { type: "no_calibration" }
  | { type: "no_coordinates" };

function toImagePoint(
  x: number | null,
  z: number | null,
  transform: MapTransform
): Point | null {
  if (x == null || z == null) return null;
  return worldToImage({ x, y: z }, transform);
}

type TimedCoord = { match_time: number; x: number | null; z: number | null };

type EventsByCategory = {
  damage: TimedCoord[];
  healing: TimedCoord[];
  kills: TimedCoord[];
};

async function fetchEvents(mapDataId: number): Promise<EventsByCategory> {
  const [damageRows, healingRows, killRows] = await Promise.all([
    prisma.damage.findMany({
      where: { MapDataId: mapDataId },
      select: { match_time: true, victim_x: true, victim_z: true },
    }),
    prisma.healing.findMany({
      where: { MapDataId: mapDataId },
      select: { match_time: true, healer_x: true, healer_z: true },
    }),
    prisma.kill.findMany({
      where: { MapDataId: mapDataId },
      select: { match_time: true, victim_x: true, victim_z: true },
    }),
  ]);

  return {
    damage: damageRows.map((r) => ({
      match_time: r.match_time,
      x: r.victim_x,
      z: r.victim_z,
    })),
    healing: healingRows.map((r) => ({
      match_time: r.match_time,
      x: r.healer_x,
      z: r.healer_z,
    })),
    kills: killRows.map((r) => ({
      match_time: r.match_time,
      x: r.victim_x,
      z: r.victim_z,
    })),
  };
}

function convertPoints(events: TimedCoord[], transform: MapTransform): Point[] {
  const result: Point[] = [];
  for (const e of events) {
    const p = toImagePoint(e.x, e.z, transform);
    if (p) result.push(p);
  }
  return result;
}

async function loadCalibration(calibrationMapName: string) {
  const calibration = await prisma.mapCalibration.findUnique({
    where: { mapName: calibrationMapName },
    select: {
      imageUrl: true,
      displayImageKey: true,
      imageWidth: true,
      imageHeight: true,
      affineA: true,
      affineB: true,
      affineC: true,
      affineD: true,
      affineTx: true,
      affineTy: true,
    },
  });

  if (
    calibration?.affineA == null ||
    calibration.affineB == null ||
    calibration.affineC == null ||
    calibration.affineD == null ||
    calibration.affineTx == null ||
    calibration.affineTy == null
  ) {
    return null;
  }

  const transform: MapTransform = {
    a: calibration.affineA,
    b: calibration.affineB,
    c: calibration.affineC,
    d: calibration.affineD,
    tx: calibration.affineTx,
    ty: calibration.affineTy,
  };

  const imagePresignedUrl = await r2.getPresignedUrl({
    key: calibration.displayImageKey ?? calibration.imageUrl,
    expiresIn: 3600,
  });

  return { calibration, transform, imagePresignedUrl };
}

function buildSubMap(
  calibrationMapName: string,
  cal: NonNullable<Awaited<ReturnType<typeof loadCalibration>>>,
  events: EventsByCategory
): HeatmapSubMap {
  const colonIdx = calibrationMapName.indexOf(": ");
  const displayName =
    colonIdx >= 0 ? calibrationMapName.slice(colonIdx + 2) : calibrationMapName;

  return {
    subMapName: displayName,
    calibrationMapName,
    imagePresignedUrl: cal.imagePresignedUrl,
    imageWidth: cal.calibration.imageWidth,
    imageHeight: cal.calibration.imageHeight,
    damagePoints: convertPoints(events.damage, cal.transform),
    healingPoints: convertPoints(events.healing, cal.transform),
    killPoints: convertPoints(events.kills, cal.transform),
  };
}

export async function getHeatmapData(mapDataId: number): Promise<HeatmapData> {
  const matchStart = await prisma.matchStart.findFirst({
    where: { MapDataId: mapDataId },
    select: { map_name: true, map_type: true },
  });

  if (!matchStart) return { type: "no_calibration" };

  const events = await fetchEvents(mapDataId);

  const hasCoords =
    events.damage.some((e) => e.x != null && e.z != null) ||
    events.healing.some((e) => e.x != null && e.z != null) ||
    events.kills.some((e) => e.x != null && e.z != null);

  if (!hasCoords) return { type: "no_coordinates" };

  if (
    matchStart.map_type === $Enums.MapType.Control &&
    isControlMap(matchStart.map_name)
  ) {
    return getControlHeatmapData(matchStart.map_name, mapDataId, events);
  }

  const cal = await loadCalibration(matchStart.map_name);
  if (!cal) return { type: "no_calibration" };

  return {
    type: "single",
    subMap: buildSubMap(matchStart.map_name, cal, events),
  };
}

function assignToRound(
  matchTime: number,
  roundStarts: { match_time: number; objective_index: number }[]
): number {
  for (let i = roundStarts.length - 1; i >= 0; i--) {
    if (matchTime >= roundStarts[i].match_time) {
      return roundStarts[i].objective_index;
    }
  }
  return 0;
}

async function getControlHeatmapData(
  mapName: string,
  mapDataId: number,
  events: EventsByCategory
): Promise<HeatmapData> {
  const roundStarts = await prisma.roundStart.findMany({
    where: { MapDataId: mapDataId },
    select: { match_time: true, objective_index: true },
    orderBy: { match_time: "asc" },
  });

  function splitBySubMap(coords: TimedCoord[]): Map<string, TimedCoord[]> {
    const result = new Map<string, TimedCoord[]>();
    for (const c of coords) {
      const idx = assignToRound(c.match_time, roundStarts);
      const name = getControlSubMapName(mapName, idx);
      if (!name) continue;
      const arr = result.get(name) ?? [];
      arr.push(c);
      result.set(name, arr);
    }
    return result;
  }

  const damageBySubMap = splitBySubMap(events.damage);
  const healingBySubMap = splitBySubMap(events.healing);
  const killsBySubMap = splitBySubMap(events.kills);

  const allSubMapNames = getControlSubMapNames(mapName);
  const subMaps: HeatmapSubMap[] = [];

  for (const calibrationMapName of allSubMapNames) {
    const cal = await loadCalibration(calibrationMapName);
    if (!cal) continue;

    const subEvents: EventsByCategory = {
      damage: damageBySubMap.get(calibrationMapName) ?? [],
      healing: healingBySubMap.get(calibrationMapName) ?? [],
      kills: killsBySubMap.get(calibrationMapName) ?? [],
    };

    subMaps.push(buildSubMap(calibrationMapName, cal, subEvents));
  }

  if (subMaps.length === 0) return { type: "no_calibration" };

  return { type: "control", subMaps };
}
