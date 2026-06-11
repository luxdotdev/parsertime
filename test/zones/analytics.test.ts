import {
  countEventsByZone,
  sumZoneRows,
  type ZoneCountRow,
} from "@/lib/zones/analytics";
import type { TaggableZone } from "@/lib/zones/tag";
import { expect, test } from "vitest";

const zones: TaggableZone[] = [
  {
    id: 1,
    name: "Point",
    category: "POINT",
    vertices: [
      [0, 0],
      [20, 0],
      [20, 20],
      [0, 20],
    ],
  },
  {
    id: 2,
    name: "Main",
    category: "LANE",
    vertices: [
      [20, 0],
      [60, 0],
      [60, 20],
      [20, 20],
    ],
  },
];
function zonesAt(): TaggableZone[] {
  return zones;
}

test("counts kills, deaths, and ults per zone per team", () => {
  const events = [
    { t: 10, x: 5, z: 5, team: "Alpha", kind: "kill" as const },
    { t: 12, x: 6, z: 5, team: "Bravo", kind: "death" as const },
    { t: 20, x: 30, z: 5, team: "Alpha", kind: "ult" as const },
    { t: 30, x: 5, z: 5, team: "Alpha", kind: "kill" as const },
  ];
  const rows = countEventsByZone(events, zonesAt);
  expect(rows).toContainEqual({
    zoneName: "Point",
    team: "Alpha",
    kills: 2,
    deaths: 0,
    ults: 0,
  });
  expect(rows).toContainEqual({
    zoneName: "Point",
    team: "Bravo",
    kills: 0,
    deaths: 1,
    ults: 0,
  });
  expect(rows).toContainEqual({
    zoneName: "Main",
    team: "Alpha",
    kills: 0,
    deaths: 0,
    ults: 1,
  });
});

test("events outside all zones and events without coords are excluded", () => {
  const events = [
    { t: 10, x: 500, z: 500, team: "Alpha", kind: "kill" as const },
    { t: 11, x: null, z: null, team: "Alpha", kind: "kill" as const },
  ];
  expect(countEventsByZone(events, zonesAt)).toEqual([]);
});

test("sumZoneRows merges tables by zone and team", () => {
  const a: ZoneCountRow[] = [
    { zoneName: "Point", team: "Alpha", kills: 2, deaths: 1, ults: 0 },
  ];
  const b: ZoneCountRow[] = [
    { zoneName: "Point", team: "Alpha", kills: 1, deaths: 0, ults: 3 },
    { zoneName: "Main", team: "Bravo", kills: 1, deaths: 0, ults: 0 },
  ];
  const merged = sumZoneRows([a, b]);
  expect(merged).toContainEqual({
    zoneName: "Point",
    team: "Alpha",
    kills: 3,
    deaths: 1,
    ults: 3,
  });
  expect(merged).toContainEqual({
    zoneName: "Main",
    team: "Bravo",
    kills: 1,
    deaths: 0,
    ults: 0,
  });
});
