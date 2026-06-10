import { tagZone, type TaggableZone } from "@/lib/zones/tag";

/**
 * Ordered zone names a route passes through, consecutive duplicates
 * collapsed. Null when no zones are provided or no point matches —
 * absence of zones is missing data, not an empty route.
 */
export function zoneSignature(
  points: { x: number; z: number }[],
  zones: TaggableZone[]
): string | null {
  if (zones.length === 0) return null;
  const names: string[] = [];
  for (const p of points) {
    const zone = tagZone(p.x, p.z, zones);
    if (!zone) continue;
    if (names[names.length - 1] !== zone.name) names.push(zone.name);
  }
  return names.length > 0 ? names.join(" → ") : null;
}
