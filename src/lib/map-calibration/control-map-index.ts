/**
 * Static mapping from control map parent names to their sub-map calibration
 * names, indexed by objective_index from RoundStart events.
 *
 * Ordering is a best-guess based on alphabetical sub-map names.
 * Verify against real game data and update if incorrect.
 */
const CONTROL_OBJECTIVE_MAP: Record<string, string[]> = {
  "Antarctic Peninsula": [
    "Antarctic Peninsula: Icebreaker",
    "Antarctic Peninsula: Labs",
    "Antarctic Peninsula: Sublevel",
  ],
  Busan: ["Busan: Downtown", "Busan: Meka Base", "Busan: Sanctuary"],
  Ilios: ["Ilios: Lighthouse", "Ilios: Ruins", "Ilios: Well"],
  "Lijiang Tower": [
    "Lijiang Tower: Control Center",
    "Lijiang Tower: Garden",
    "Lijiang Tower: Night Market",
  ],
  Nepal: ["Nepal: Sanctum", "Nepal: Shrine", "Nepal: Village"],
  Oasis: ["Oasis: City Center", "Oasis: Gardens", "Oasis: University"],
  Samoa: ["Samoa: Beach", "Samoa: Downtown", "Samoa: Volcano"],
};

export function getControlSubMapName(
  mapName: string,
  objectiveIndex: number
): string | null {
  const subMaps = CONTROL_OBJECTIVE_MAP[mapName];
  if (!subMaps) return null;
  return subMaps[objectiveIndex] ?? null;
}

export function getControlSubMapNames(mapName: string): string[] {
  return CONTROL_OBJECTIVE_MAP[mapName] ?? [];
}

export function isControlMap(mapName: string): boolean {
  return mapName in CONTROL_OBJECTIVE_MAP;
}
