import {
  getControlSubMapName,
  getControlSubMapNames,
  isControlMap,
} from "@/lib/map-calibration/control-map-index";
import { loadCalibration } from "@/lib/map-calibration/load-calibration";
import type { MapTransform } from "@/lib/map-calibration/types";
import { worldToImage } from "@/lib/map-calibration/world-to-image";
import prisma from "@/lib/prisma";
import { $Enums } from "@prisma/client";

type Point = { u: number; v: number };
export type KillPoint = Point & {
  team: 1 | 2;
  attackerName: string;
  attackerHero: string;
  victimName: string;
  victimHero: string;
  ability: string;
  matchTime: number;
};

export type HeatmapSubMap = {
  subMapName: string;
  calibrationMapName: string;
  imagePresignedUrl: string;
  imageWidth: number;
  imageHeight: number;
  damagePoints: Point[];
  healingPoints: Point[];
  killPoints: KillPoint[];
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
type TimedKillCoord = TimedCoord & {
  victim_team: string;
  attacker_name: string;
  attacker_hero: string;
  victim_name: string;
  victim_hero: string;
  event_ability: string;
};

type EventsByCategory = {
  damage: TimedCoord[];
  healing: TimedCoord[];
  kills: TimedKillCoord[];
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
      select: {
        match_time: true,
        victim_x: true,
        victim_z: true,
        victim_team: true,
        attacker_name: true,
        attacker_hero: true,
        victim_name: true,
        victim_hero: true,
        event_ability: true,
      },
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
      victim_team: r.victim_team,
      attacker_name: r.attacker_name,
      attacker_hero: r.attacker_hero,
      victim_name: r.victim_name,
      victim_hero: r.victim_hero,
      event_ability: r.event_ability,
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

function convertKillPoints(
  events: TimedKillCoord[],
  transform: MapTransform,
  team1Name: string
): KillPoint[] {
  const result: KillPoint[] = [];
  for (const e of events) {
    const p = toImagePoint(e.x, e.z, transform);
    if (p) {
      result.push({
        ...p,
        team: e.victim_team === team1Name ? 1 : 2,
        attackerName: e.attacker_name,
        attackerHero: e.attacker_hero,
        victimName: e.victim_name,
        victimHero: e.victim_hero,
        ability: e.event_ability,
        matchTime: e.match_time,
      });
    }
  }
  return result;
}

function buildSubMap(
  calibrationMapName: string,
  cal: NonNullable<Awaited<ReturnType<typeof loadCalibration>>>,
  events: EventsByCategory,
  team1Name: string
): HeatmapSubMap {
  const colonIdx = calibrationMapName.indexOf(": ");
  const displayName =
    colonIdx >= 0 ? calibrationMapName.slice(colonIdx + 2) : calibrationMapName;

  return {
    subMapName: displayName,
    calibrationMapName,
    imagePresignedUrl: cal.imagePresignedUrl,
    imageWidth: cal.imageWidth,
    imageHeight: cal.imageHeight,
    damagePoints: convertPoints(events.damage, cal.transform),
    healingPoints: convertPoints(events.healing, cal.transform),
    killPoints: convertKillPoints(events.kills, cal.transform, team1Name),
  };
}

export async function getHeatmapData(mapDataId: number): Promise<HeatmapData> {
  const matchStart = await prisma.matchStart.findFirst({
    where: { MapDataId: mapDataId },
    select: { map_name: true, map_type: true, team_1_name: true },
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
    return getControlHeatmapData(
      matchStart.map_name,
      mapDataId,
      events,
      matchStart.team_1_name
    );
  }

  const cal = await loadCalibration(matchStart.map_name);
  if (!cal) return { type: "no_calibration" };

  return {
    type: "single",
    subMap: buildSubMap(
      matchStart.map_name,
      cal,
      events,
      matchStart.team_1_name
    ),
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
  events: EventsByCategory,
  team1Name: string
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
      kills: (killsBySubMap.get(calibrationMapName) ?? []) as TimedKillCoord[],
    };

    subMaps.push(buildSubMap(calibrationMapName, cal, subEvents, team1Name));
  }

  if (subMaps.length === 0) return { type: "no_calibration" };

  return { type: "control", subMaps };
}
