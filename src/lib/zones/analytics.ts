import { tagZone, type TaggableZone } from "@/lib/zones/tag";

export type ZoneCountEvent = {
  t: number;
  x: number | null;
  z: number | null;
  team: string;
  kind: "kill" | "death" | "ult";
};

export type ZoneCountRow = {
  zoneName: string;
  team: string;
  kills: number;
  deaths: number;
  ults: number;
};

/**
 * Counts per (zone, team). Events without coordinates or outside every
 * published zone are EXCLUDED — they are missing data, not a "no zone"
 * bucket.
 */
export function countEventsByZone(
  events: ZoneCountEvent[],
  zonesAt: (matchTime: number) => TaggableZone[]
): ZoneCountRow[] {
  const acc = new Map<string, ZoneCountRow>();
  for (const e of events) {
    if (e.x == null || e.z == null) continue;
    const zone = tagZone(e.x, e.z, zonesAt(e.t));
    if (!zone) continue;
    const key = `${zone.name}::${e.team}`;
    const row = acc.get(key) ?? {
      zoneName: zone.name,
      team: e.team,
      kills: 0,
      deaths: 0,
      ults: 0,
    };
    if (e.kind === "kill") row.kills++;
    else if (e.kind === "death") row.deaths++;
    else row.ults++;
    acc.set(key, row);
  }
  return [...acc.values()];
}

/** Merge tables (e.g., a scrim's maps of the same base map) by zone+team. */
export function sumZoneRows(tables: ZoneCountRow[][]): ZoneCountRow[] {
  const acc = new Map<string, ZoneCountRow>();
  for (const table of tables) {
    for (const row of table) {
      const key = `${row.zoneName}::${row.team}`;
      const merged = acc.get(key) ?? {
        zoneName: row.zoneName,
        team: row.team,
        kills: 0,
        deaths: 0,
        ults: 0,
      };
      merged.kills += row.kills;
      merged.deaths += row.deaths;
      merged.ults += row.ults;
      acc.set(key, merged);
    }
  }
  return [...acc.values()];
}
