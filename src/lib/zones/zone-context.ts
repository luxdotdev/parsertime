import { CONTROL_OBJECTIVE_MAP } from "@/lib/map-calibration/control-map-index";
import prisma from "@/lib/prisma";
import type { TaggableZone } from "@/lib/zones/tag";

export type ZoneContext = {
  zonesAt: (matchTime: number) => TaggableZone[];
  hasPointZones: boolean;
};

export const EMPTY_ZONE_CONTEXT: ZoneContext = {
  zonesAt: () => [],
  hasPointZones: false,
};

export type ZoneContextInput = {
  mapDataId: number;
  /** The Map relation name ("King's Row", "Busan") — the calibration key. */
  mapName: string | null;
  /** Ascending by match_time; only consulted for control maps. */
  roundStarts: { match_time: number; objective_index: number }[];
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

function buildContext(
  input: ZoneContextInput,
  zonesByCalibrationName: Map<string, TaggableZone[]>
): ZoneContext {
  if (!input.mapName) return EMPTY_ZONE_CONTEXT;

  const subMaps = CONTROL_OBJECTIVE_MAP[input.mapName];
  if (!subMaps) {
    const zones = zonesByCalibrationName.get(input.mapName) ?? [];
    return {
      zonesAt: () => zones,
      hasPointZones: zones.some((z) => z.category === "POINT"),
    };
  }

  // Control: zones per objective_index, rounds assign times to indexes.
  // Sub-map arenas can overlap in world space — never tag across them.
  const zonesByIndex = new Map<number, TaggableZone[]>();
  subMaps.forEach((subName, idx) => {
    const zones = zonesByCalibrationName.get(subName);
    if (zones) zonesByIndex.set(idx, zones);
  });
  const rounds = input.roundStarts;
  function zonesAt(t: number): TaggableZone[] {
    let current: number | null = null;
    for (const r of rounds) {
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

/**
 * Zone contexts for many maps with ONE calibration query. The per-map
 * `loadZoneContext` issues 2-4 queries each; on the team dashboard that
 * multiplied into hundreds of round trips, so batch paths resolve every
 * map's published zones in a single `IN` fetch and build the lookup
 * functions in memory.
 */
export async function buildZoneContextsForMaps(
  inputs: ZoneContextInput[]
): Promise<Map<number, ZoneContext>> {
  const calibrationNames = new Set<string>();
  for (const input of inputs) {
    if (!input.mapName) continue;
    const subMaps = CONTROL_OBJECTIVE_MAP[input.mapName];
    if (subMaps) for (const subName of subMaps) calibrationNames.add(subName);
    else calibrationNames.add(input.mapName);
  }

  const calibrations =
    calibrationNames.size === 0
      ? []
      : await prisma.mapCalibration.findMany({
          where: { mapName: { in: [...calibrationNames] } },
          select: {
            mapName: true,
            zones: {
              where: { status: "PUBLISHED" },
              select: { id: true, name: true, category: true, vertices: true },
            },
          },
        });
  const zonesByCalibrationName = new Map(
    calibrations.map((c) => [c.mapName, toTaggable(c.zones)])
  );

  const result = new Map<number, ZoneContext>();
  for (const input of inputs) {
    result.set(input.mapDataId, buildContext(input, zonesByCalibrationName));
  }
  return result;
}
