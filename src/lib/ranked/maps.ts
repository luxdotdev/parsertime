import { toKebabCase } from "@/lib/utils";
import { mapNameToMapTypeMapping, type MapName } from "@/types/map";
import { $Enums } from "@prisma/client";

/**
 * Seasonal variants and casing duplicates excluded from the ranked tracker,
 * mirroring the coaching canvas map selector (`EXCLUDED_MAPS`). The lowercase
 * "Circuit royal" is the casing-duplicate key in the source mapping; dropping
 * it (and keeping "Circuit Royal") is what fixes the match data filtering —
 * otherwise played "Circuit Royal" games never match the "Circuit royal" entry
 * and the map reads as never-played. Clash maps are excluded separately below
 * (by map type) since the mode is not in the ranked rotation.
 */
export const EXCLUDED_RANKED_MAPS = new Set<string>([
  "Blizzard World (Winter)",
  "Eichenwalde (Halloween)",
  "Hollywood (Halloween)",
  "King's Row (Winter)",
  "Lijiang Tower (Lunar New Year)",
  "Circuit royal",
]);

export type RankedMap = { name: MapName; type: $Enums.MapType };

/**
 * The definitive ranked map list: every map in the source mapping minus the
 * excluded variants and Clash maps (not played in ranked), deduped by
 * kebab-case key. Shared by the intake form picker and the never-played stats
 * so the two never disagree.
 */
export const RANKED_MAPS: RankedMap[] = (() => {
  const byKebab = new Map<string, RankedMap>();
  for (const [name, type] of Object.entries(mapNameToMapTypeMapping) as [
    MapName,
    $Enums.MapType,
  ][]) {
    if (EXCLUDED_RANKED_MAPS.has(name)) continue;
    if (type === $Enums.MapType.Clash) continue;
    byKebab.set(toKebabCase(name), { name, type });
  }
  return Array.from(byKebab.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
})();

export const RANKED_MAP_NAMES: MapName[] = RANKED_MAPS.map((m) => m.name);
