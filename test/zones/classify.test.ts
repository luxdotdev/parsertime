import { resolveCalibrationTarget } from "@/lib/zones/classify";
import { expect, test } from "vitest";

test("control sub-map names resolve to base map + objective index", () => {
  expect(resolveCalibrationTarget("Nepal: Sanctum")).toEqual({
    baseMapName: "Nepal",
    objectiveIndex: 0,
  });
  expect(resolveCalibrationTarget("Nepal: Village")).toEqual({
    baseMapName: "Nepal",
    objectiveIndex: 2,
  });
});

test("non-control names pass through with null index", () => {
  expect(resolveCalibrationTarget("King's Row")).toEqual({
    baseMapName: "King's Row",
    objectiveIndex: null,
  });
});
