import {
  buildDensityGrid,
  cellCenterWorld,
  gaussianBlur,
  worldToCell,
} from "@/lib/zones/grid";
import { expect, test } from "vitest";

test("buildDensityGrid bins samples into cells with padding", () => {
  const samples = [
    { x: 0, z: 0 },
    { x: 0.5, z: 0.5 },
    { x: 30, z: 30 },
  ];
  const grid = buildDensityGrid(samples, 3);
  expect(grid.spec.cellSize).toBe(3);
  const c0 = worldToCell(0, 0, grid.spec);
  const c1 = worldToCell(0.5, 0.5, grid.spec);
  expect(c0).toEqual(c1);
  expect(grid.counts[c0!.row * grid.spec.cols + c0!.col]).toBe(2);
});

test("worldToCell returns null outside the grid", () => {
  const grid = buildDensityGrid(
    [
      { x: 0, z: 0 },
      { x: 9, z: 9 },
    ],
    3
  );
  expect(worldToCell(1000, 1000, grid.spec)).toBeNull();
});

test("cellCenterWorld inverts worldToCell to the cell center", () => {
  const grid = buildDensityGrid(
    [
      { x: 0, z: 0 },
      { x: 30, z: 30 },
    ],
    3
  );
  const cell = worldToCell(15, 15, grid.spec)!;
  const center = cellCenterWorld(cell.col, cell.row, grid.spec);
  expect(Math.abs(center.x - 15)).toBeLessThanOrEqual(1.5);
  expect(Math.abs(center.z - 15)).toBeLessThanOrEqual(1.5);
});

test("gaussianBlur preserves total mass and spreads a spike", () => {
  const grid = buildDensityGrid(
    Array.from({ length: 10 }, () => ({ x: 15, z: 15 })),
    3
  );
  const before = grid.counts.reduce((a, b) => a + b, 0);
  const blurred = gaussianBlur(grid);
  const after = blurred.counts.reduce((a, b) => a + b, 0);
  expect(Math.abs(before - after)).toBeLessThan(0.001);
  const spike = worldToCell(15, 15, grid.spec)!;
  const idx = spike.row * grid.spec.cols + spike.col;
  expect(blurred.counts[idx]).toBeLessThan(10);
  expect(blurred.counts[idx]).toBeGreaterThan(0);
});
