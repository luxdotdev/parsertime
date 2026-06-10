import { convexHull, pointInPolygon, polygonArea } from "@/lib/zones/geometry";
import { expect, test } from "vitest";

const square: Array<[number, number]> = [
  [0, 0],
  [10, 0],
  [10, 10],
  [0, 10],
];

test("pointInPolygon detects inside and outside", () => {
  expect(pointInPolygon(5, 5, square)).toBe(true);
  expect(pointInPolygon(15, 5, square)).toBe(false);
  expect(pointInPolygon(-1, -1, square)).toBe(false);
});

test("pointInPolygon handles concave polygons", () => {
  const u: Array<[number, number]> = [
    [0, 0],
    [10, 0],
    [10, 10],
    [7, 10],
    [7, 3],
    [3, 3],
    [3, 10],
    [0, 10],
  ];
  expect(pointInPolygon(5, 8, u)).toBe(false);
  expect(pointInPolygon(5, 1, u)).toBe(true);
});

test("polygonArea of a 10x10 square is 100", () => {
  expect(polygonArea(square)).toBe(100);
});

test("convexHull of points with interior noise returns the bounding square", () => {
  const points: Array<[number, number]> = [...square, [5, 5], [2, 7], [8, 3]];
  const hull = convexHull(points);
  expect(hull).toHaveLength(4);
  expect(polygonArea(hull)).toBe(100);
});

test("convexHull of fewer than 3 points returns empty", () => {
  expect(
    convexHull([
      [0, 0],
      [1, 1],
    ])
  ).toEqual([]);
});
