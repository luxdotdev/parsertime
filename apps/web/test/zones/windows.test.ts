import { buildWindows, inWindows } from "@/lib/zones/windows";
import { expect, test } from "vitest";

test("buildWindows pads and merges overlapping intervals", () => {
  const windows = buildWindows([10, 18, 100], 5);
  expect(windows).toEqual([
    [5, 23],
    [95, 105],
  ]);
});

test("inWindows checks membership inclusively", () => {
  const windows = buildWindows([10], 5);
  expect(inWindows(5, windows)).toBe(true);
  expect(inWindows(15, windows)).toBe(true);
  expect(inWindows(15.1, windows)).toBe(false);
  expect(inWindows(0, windows)).toBe(false);
});

test("buildWindows of empty input is empty and inWindows is false", () => {
  expect(buildWindows([], 5)).toEqual([]);
  expect(inWindows(10, [])).toBe(false);
});
