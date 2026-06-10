import {
  clusterRoutes,
  resampleRoute,
  routeDistance,
} from "@/lib/routes/cluster";
import { expect, test } from "vitest";

function straight(z0: number, n = 11) {
  return Array.from({ length: n }, (_, i) => ({ x: (i * 100) / (n - 1), z: z0 }));
}

test("resampleRoute produces evenly spaced points by arc length", () => {
  const resampled = resampleRoute(straight(0, 5), 21);
  expect(resampled).toHaveLength(21);
  expect(resampled[0]).toEqual({ x: 0, z: 0 });
  expect(resampled[20].x).toBeCloseTo(100);
  for (let i = 1; i < 21; i++) {
    const gap = Math.hypot(
      resampled[i].x - resampled[i - 1].x,
      resampled[i].z - resampled[i - 1].z
    );
    expect(gap).toBeCloseTo(5, 1);
  }
});

test("routeDistance is the mean pointwise distance", () => {
  const a = resampleRoute(straight(0), 20);
  const b = resampleRoute(straight(10), 20);
  expect(routeDistance(a, b)).toBeCloseTo(10);
});

test("parallel paths within threshold merge; distant paths do not", () => {
  const routes = [
    straight(0),
    straight(10),
    straight(60),
  ];
  const clusters = clusterRoutes(routes);
  expect(clusters).toHaveLength(2);
  const sizes = clusters.map((c) => c.routeIndexes.length).sort();
  expect(sizes).toEqual([1, 2]);
});

test("single-link chaining merges a gradient of paths", () => {
  const clusters = clusterRoutes([straight(0), straight(10), straight(20)]);
  expect(clusters).toHaveLength(1);
});

test("medoid is the route minimizing total distance to cluster members", () => {
  const clusters = clusterRoutes([straight(0), straight(10), straight(20)]);
  expect(clusters[0].medoidIndex).toBe(1);
});
