import { tagZone, type TaggableZone } from "@/lib/zones/tag";
import { expect, test } from "vitest";

const point: TaggableZone = {
  id: 1,
  name: "Point",
  category: "POINT",
  vertices: [
    [40, 40],
    [60, 40],
    [60, 60],
    [40, 60],
  ],
};
const lane: TaggableZone = {
  id: 2,
  name: "Main",
  category: "LANE",
  vertices: [
    [0, 30],
    [100, 30],
    [100, 70],
    [0, 70],
  ],
};

test("returns the containing zone", () => {
  expect(tagZone(10, 50, [point, lane])?.id).toBe(2);
});

test("smallest area wins on overlap (point inside lane)", () => {
  expect(tagZone(50, 50, [lane, point])?.id).toBe(1);
});

test("returns null outside all zones", () => {
  expect(tagZone(500, 500, [point, lane])).toBeNull();
});
