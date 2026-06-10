import { labelLanes, tracePayloadPath } from "@/lib/zones/label";
import { expect, test } from "vitest";

test("tracePayloadPath orders centroids by objective then progress", () => {
  const progress = [
    { match_time: 10, mapDataId: 1, objective_index: 0, progress: 10 },
    { match_time: 20, mapDataId: 1, objective_index: 0, progress: 50 },
    { match_time: 30, mapDataId: 1, objective_index: 1, progress: 20 },
  ];
  const events = [
    { match_time: 11, mapDataId: 1, x: 10, z: 0 },
    { match_time: 12, mapDataId: 1, x: 12, z: 0 },
    { match_time: 21, mapDataId: 1, x: 50, z: 0 },
    { match_time: 31, mapDataId: 1, x: 90, z: 0 },
  ];
  const path = tracePayloadPath(events, progress);
  expect(path.length).toBe(3);
  expect(path[0].x).toBeCloseTo(11);
  expect(path[1].x).toBeCloseTo(50);
  expect(path[2].x).toBeCloseTo(90);
});

test("events before any progress row are dropped, cross-map times don't mix", () => {
  const progress = [
    { match_time: 100, mapDataId: 1, objective_index: 0, progress: 10 },
  ];
  const events = [
    { match_time: 50, mapDataId: 1, x: 1, z: 1 },
    { match_time: 100, mapDataId: 2, x: 99, z: 99 },
    { match_time: 110, mapDataId: 1, x: 5, z: 5 },
  ];
  const path = tracePayloadPath(events, progress);
  expect(path).toEqual([{ x: 5, z: 5 }]);
});

test("labelLanes marks the corridor hugging the path as MAIN", () => {
  const path = [
    { x: 0, z: 20 },
    { x: 100, z: 20 },
    { x: 200, z: 20 },
  ];
  const lanes = [
    { centerline: [{ x: 0, z: 100 }, { x: 200, z: 100 }] },
    { centerline: [{ x: 0, z: 21 }, { x: 100, z: 19 }, { x: 200, z: 22 }] },
  ];
  expect(labelLanes(lanes, path)).toEqual(["FLANK", "MAIN"]);
});

test("labelLanes returns nulls when no path or nothing close enough", () => {
  const lanes = [{ centerline: [{ x: 0, z: 0 }, { x: 10, z: 0 }] }];
  expect(labelLanes(lanes, [])).toEqual([null]);
  const farPath = [{ x: 0, z: 500 }, { x: 10, z: 500 }];
  expect(labelLanes(lanes, farPath)).toEqual([null]);
});
