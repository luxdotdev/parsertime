import { pointInPolygon, polygonArea, type Vertex } from "@/lib/zones/geometry";

export type TaggableZone = {
  id: number;
  name: string;
  category: "POINT" | "LANE";
  vertices: Vertex[];
};

/**
 * Smallest-area containing zone, or null. Callers are responsible for
 * passing only PUBLISHED zones.
 */
export function tagZone(
  x: number,
  z: number,
  zones: TaggableZone[]
): TaggableZone | null {
  let best: TaggableZone | null = null;
  let bestArea = Infinity;
  for (const zone of zones) {
    if (!pointInPolygon(x, z, zone.vertices)) continue;
    const area = polygonArea(zone.vertices);
    if (area < bestArea) {
      best = zone;
      bestArea = area;
    }
  }
  return best;
}
