import {
  buildFightField,
  CALLOUT_MIN_FIGHTS,
  FIELD_MIN_TOTAL_FIGHTS,
  type FightPoint,
} from "@/lib/fight-field";
import { expect, test } from "vitest";

/** n fights deterministically jittered ±3m around (cx, cz). */
function cluster(
  n: number,
  cx: number,
  cz: number,
  won: boolean
): FightPoint[] {
  return Array.from({ length: n }, (_, i) => ({
    x: cx + ((i * 7) % 7) - 3,
    z: cz + ((i * 5) % 7) - 3,
    won,
  }));
}

test("returns null below the minimum fight count", () => {
  expect(
    buildFightField(cluster(FIELD_MIN_TOTAL_FIGHTS - 1, 0, 0, true))
  ).toBeNull();
});

test("win and loss clusters produce correctly signed cells", () => {
  const field = buildFightField([
    ...cluster(8, 0, 0, true),
    ...cluster(8, 100, 100, false),
  ])!;
  expect(field.totalFights).toBe(16);
  expect(field.overallWinrate).toBe(50);

  function near(x: number, z: number) {
    return field.cells.filter((c) => Math.hypot(c.x - x, c.z - z) < 10);
  }
  const winCells = near(0, 0);
  const lossCells = near(100, 100);
  expect(winCells.length).toBeGreaterThan(0);
  expect(lossCells.length).toBeGreaterThan(0);
  for (const c of winCells) expect(c.winrate).toBeGreaterThanOrEqual(80);
  for (const c of lossCells) expect(c.winrate).toBeLessThanOrEqual(20);
});

test("cells have no opinion where nothing happened", () => {
  const field = buildFightField([
    ...cluster(8, 0, 0, true),
    ...cluster(8, 100, 100, false),
  ])!;
  const middle = field.cells.filter((c) => Math.hypot(c.x - 50, c.z - 50) < 15);
  expect(middle).toHaveLength(0);
});

test("callouts find both areas with raw records and respect polarity", () => {
  const field = buildFightField([
    ...cluster(8, 0, 0, true),
    ...cluster(8, 100, 100, false),
  ])!;
  const strong = field.callouts.filter((c) => c.polarity === "strong");
  const weak = field.callouts.filter((c) => c.polarity === "weak");
  expect(strong.length).toBeGreaterThanOrEqual(1);
  expect(weak.length).toBeGreaterThanOrEqual(1);
  expect(Math.hypot(strong[0].x, strong[0].z)).toBeLessThan(15);
  expect(strong[0].won).toBe(8);
  expect(strong[0].lost).toBe(0);
  expect(Math.hypot(weak[0].x - 100, weak[0].z - 100)).toBeLessThan(15);
  expect(weak[0].lost).toBe(8);
});

test("two adjacent win pockets collapse into one callout (separation)", () => {
  const field = buildFightField([
    ...cluster(6, 0, 0, true),
    ...cluster(6, 10, 0, true), // 10m away — within the separation radius
    ...cluster(8, 150, 150, false),
  ])!;
  const strong = field.callouts.filter((c) => c.polarity === "strong");
  expect(strong).toHaveLength(1);
});

test("a pocket below CALLOUT_MIN_FIGHTS earns no callout", () => {
  const field = buildFightField([
    ...cluster(CALLOUT_MIN_FIGHTS - 2, -200, -200, true), // tiny win pocket
    ...cluster(10, 0, 0, true),
    ...cluster(10, 100, 100, false),
  ])!;
  const strongFar = field.callouts.filter(
    (c) => c.polarity === "strong" && Math.hypot(c.x + 200, c.z + 200) < 20
  );
  expect(strongFar).toHaveLength(0);
});
