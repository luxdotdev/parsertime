import prisma from "@/lib/prisma";

/**
 * Resolves a Map.id to its corresponding MapData.id.
 * URL route params use Map.id, but event tables reference MapData.id.
 */
export async function resolveMapDataId(mapId: number): Promise<number> {
  const mapData = await prisma.mapData.findFirst({
    where: { mapId },
    select: { id: true },
  });
  if (!mapData) {
    const directCheck = await prisma.mapData.findUnique({
      where: { id: mapId },
      select: { id: true },
    });
    if (directCheck) return directCheck.id;
    throw new Error(`No MapData found for mapId=${mapId}`);
  }
  return mapData.id;
}

/**
 * Resolves a Map.id to MapData.id only when the map belongs to the route scrim.
 * Use this for request-controlled route params so MapData.id fallbacks cannot
 * cross resource boundaries.
 */
export async function resolveScrimMapDataId(
  scrimId: number,
  mapId: number
): Promise<number> {
  const mapData = await prisma.mapData.findFirst({
    where: { scrimId, mapId },
    select: { id: true },
  });
  if (!mapData) {
    throw new Error(`No MapData found for scrimId=${scrimId}, mapId=${mapId}`);
  }
  return mapData.id;
}
