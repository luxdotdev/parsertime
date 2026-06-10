import { extractLanes } from "@/lib/zones/lanes";
import { buildDensityGrid, gaussianBlur } from "@/lib/zones/grid";
import { pointInPolygon } from "@/lib/zones/geometry";
import { expect, test } from "vitest";

function ridge(
  x1: number,
  z1: number,
  x2: number,
  z2: number,
  width: number,
  perMeter: number
) {
  const out = [];
  const len = Math.hypot(x2 - x1, z2 - z1);
  const n = Math.floor(len * perMeter);
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const jitter = ((i % 7) / 7 - 0.5) * width;
    const dx = (x2 - x1) / len;
    const dz = (z2 - z1) / len;
    out.push({
      x: x1 + t * (x2 - x1) - dz * jitter,
      z: z1 + t * (z2 - z1) + dx * jitter,
    });
  }
  return out;
}

test("three parallel ridges produce three lane corridors", () => {
  const samples = [
    ...ridge(0, 20, 200, 20, 6, 8),
    ...ridge(0, 60, 200, 60, 6, 8),
    ...ridge(0, 100, 200, 100, 6, 8),
  ];
  const grid = gaussianBlur(buildDensityGrid(samples, 3));
  const lanes = extractLanes(grid);
  expect(lanes).toHaveLength(3);
  const mids = [20, 60, 100];
  for (const mid of mids) {
    expect(
      lanes.some((lane) => pointInPolygon(100, mid, lane.polygon))
    ).toBe(true);
  }
});

test("short spurs are pruned", () => {
  const samples = [
    ...ridge(0, 50, 200, 50, 6, 8),
    ...ridge(100, 50, 100, 65, 6, 8),
  ];
  const grid = gaussianBlur(buildDensityGrid(samples, 3));
  const lanes = extractLanes(grid);
  expect(lanes).toHaveLength(1);
});

test("sparse data yields no lanes", () => {
  const samples = ridge(0, 50, 20, 50, 6, 1);
  const grid = gaussianBlur(buildDensityGrid(samples, 3));
  expect(extractLanes(grid)).toHaveLength(0);
});

test("lane centerline endpoints span the ridge", () => {
  const samples = ridge(0, 50, 200, 50, 6, 8);
  const grid = gaussianBlur(buildDensityGrid(samples, 3));
  const [lane] = extractLanes(grid);
  const xs = lane.centerline.map((p) => p.x);
  expect(Math.min(...xs)).toBeLessThan(30);
  expect(Math.max(...xs)).toBeGreaterThan(170);
});
