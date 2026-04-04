import {
  getControlSubMapName,
  isControlMap,
} from "@/lib/map-calibration/control-map-index";
import {
  loadCalibration,
  type LoadedCalibration,
} from "@/lib/map-calibration/load-calibration";
import prisma from "@/lib/prisma";
import { $Enums } from "@prisma/client";

export type KillfeedCalibrationData = {
  calibrations: Map<string, LoadedCalibration>;
  mapName: string;
  mapType: $Enums.MapType;
  roundStarts: { match_time: number; objective_index: number }[];
};

export async function getKillfeedCalibration(
  mapDataId: number
): Promise<KillfeedCalibrationData | null> {
  const matchStart = await prisma.matchStart.findFirst({
    where: { MapDataId: mapDataId },
    select: { map_name: true, map_type: true },
  });

  if (!matchStart) return null;

  const calibrations = new Map<string, LoadedCalibration>();

  if (
    matchStart.map_type === $Enums.MapType.Control &&
    isControlMap(matchStart.map_name)
  ) {
    const roundStarts = await prisma.roundStart.findMany({
      where: { MapDataId: mapDataId },
      select: { match_time: true, objective_index: true },
      orderBy: { match_time: "asc" },
    });

    const seenIndices = new Set<number>();
    for (const rs of roundStarts) {
      seenIndices.add(rs.objective_index);
    }

    for (const idx of seenIndices) {
      const subMapName = getControlSubMapName(matchStart.map_name, idx);
      if (!subMapName) continue;
      const cal = await loadCalibration(subMapName);
      if (cal) calibrations.set(subMapName, cal);
    }

    return {
      calibrations,
      mapName: matchStart.map_name,
      mapType: matchStart.map_type,
      roundStarts,
    };
  }

  const cal = await loadCalibration(matchStart.map_name);
  if (cal) calibrations.set(matchStart.map_name, cal);

  return {
    calibrations,
    mapName: matchStart.map_name,
    mapType: matchStart.map_type,
    roundStarts: [],
  };
}

export type SerializedCalibrationData = {
  calibrations: Record<string, LoadedCalibration>;
  mapName: string;
  mapType: string;
  roundStarts: { match_time: number; objective_index: number }[];
} | null;

export function serializeCalibrationData(
  data: KillfeedCalibrationData | null
): SerializedCalibrationData {
  if (!data) return null;
  const obj: Record<string, LoadedCalibration> = {};
  for (const [key, val] of data.calibrations) {
    obj[key] = val;
  }
  return {
    calibrations: obj,
    mapName: data.mapName,
    mapType: data.mapType,
    roundStarts: data.roundStarts,
  };
}
