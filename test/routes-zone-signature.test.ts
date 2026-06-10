import { zoneSignature } from "@/lib/routes/zone-signature";
import type { TaggableZone } from "@/lib/zones/tag";
import { expect, test } from "vitest";

const zones: TaggableZone[] = [
  {
    id: 1,
    name: "Spawn",
    category: "LANE",
    vertices: [[0, 0], [10, 0], [10, 10], [0, 10]],
  },
  {
    id: 2,
    name: "Main",
    category: "LANE",
    vertices: [[10, 0], [50, 0], [50, 10], [10, 10]],
  },
  {
    id: 3,
    name: "Point",
    category: "POINT",
    vertices: [[50, 0], [70, 0], [70, 10], [50, 10]],
  },
];

test("signature lists zones in traversal order, duplicates collapsed", () => {
  const points = [
    { x: 5, z: 5 },
    { x: 7, z: 5 },
    { x: 20, z: 5 },
    { x: 40, z: 5 },
    { x: 60, z: 5 },
  ];
  expect(zoneSignature(points, zones)).toBe("Spawn → Main → Point");
});

test("points outside all zones are skipped, not labeled", () => {
  const points = [
    { x: 5, z: 5 },
    { x: 5, z: 500 },
    { x: 60, z: 5 },
  ];
  expect(zoneSignature(points, zones)).toBe("Spawn → Point");
});

test("null when no zones are provided or nothing matches", () => {
  expect(zoneSignature([{ x: 5, z: 5 }], [])).toBeNull();
  expect(zoneSignature([{ x: 999, z: 999 }], zones)).toBeNull();
});
