import prisma from "@/lib/prisma";

/**
 * Resolves a Map.id to its corresponding MapData.id.
 * URL route params use Map.id, but event tables reference MapData.id.
 */
export async function resolveMapDataId(mapId: number): Promise<number> {
  const mapData = await prisma.mapData.findFirst({
    where: { mapId },
    select: { id: true },
    // A map can have more than one MapData row (e.g. a re-upload). Without an
    // explicit order, `findFirst` returns an arbitrary row that can differ
    // between calls — and this id feeds cached-function arguments (e.g.
    // getCachedMatchStory), so a non-deterministic result breaks the cache key
    // between PPR's warming and final prerender passes ("Unexpected cache miss
    // after cache warming phase"). Pin the oldest row for a stable result.
    orderBy: { id: "asc" },
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
    // Deterministic pick: a map can have multiple MapData rows and this id is a
    // cached-function argument across every map tab, so an unordered `findFirst`
    // makes the cache key differ between PPR passes ("Unexpected cache miss
    // after cache warming phase" → dynamic "use cache" hanging promise).
    orderBy: { id: "asc" },
  });
  if (!mapData) {
    throw new Error(`No MapData found for scrimId=${scrimId}, mapId=${mapId}`);
  }
  return mapData.id;
}
