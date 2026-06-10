import {
  ROUTE_CLUSTER_THRESHOLD_M,
  ROUTE_RESAMPLE_POINTS,
} from "@/lib/routes/constants";

type Pt = { x: number; z: number };

/** Resample a polyline to n points evenly spaced by arc length. */
export function resampleRoute(points: Pt[], n = ROUTE_RESAMPLE_POINTS): Pt[] {
  if (points.length === 0) return [];
  if (points.length === 1) return Array.from({ length: n }, () => points[0]);

  const cumulative = [0];
  for (let i = 1; i < points.length; i++) {
    cumulative.push(
      cumulative[i - 1] +
        Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z)
    );
  }
  const total = cumulative[cumulative.length - 1];
  if (total === 0) return Array.from({ length: n }, () => points[0]);

  const out: Pt[] = [];
  let seg = 0;
  for (let i = 0; i < n; i++) {
    const target = (total * i) / (n - 1);
    while (seg < points.length - 2 && cumulative[seg + 1] < target) seg++;
    const segLen = cumulative[seg + 1] - cumulative[seg];
    const frac = segLen > 0 ? (target - cumulative[seg]) / segLen : 0;
    out.push({
      x: points[seg].x + frac * (points[seg + 1].x - points[seg].x),
      z: points[seg].z + frac * (points[seg + 1].z - points[seg].z),
    });
  }
  return out;
}

/** Mean pointwise distance between two equal-length resampled routes. */
export function routeDistance(a: Pt[], b: Pt[]): number {
  let total = 0;
  for (let i = 0; i < a.length; i++) {
    total += Math.hypot(a[i].x - b[i].x, a[i].z - b[i].z);
  }
  return total / a.length;
}

export type RouteCluster = {
  routeIndexes: number[];
  medoidIndex: number;
};

/**
 * Single-link agglomerative clustering over raw route polylines.
 * O(n^2) distance matrix + iterative merging — fine for per-map and
 * per-tendencies route counts (hundreds).
 */
export function clusterRoutes(routes: Pt[][]): RouteCluster[] {
  const n = routes.length;
  if (n === 0) return [];
  const resampled = routes.map((r) => resampleRoute(r));

  const dist: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      dist[i][j] = dist[j][i] = routeDistance(resampled[i], resampled[j]);
    }
  }

  const parent = Array.from({ length: n }, (_, i) => i);

  function find(i: number): number {
    if (parent[i] !== i) parent[i] = find(parent[i]);
    return parent[i];
  }

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (dist[i][j] <= ROUTE_CLUSTER_THRESHOLD_M) {
        parent[find(i)] = find(j);
      }
    }
  }

  const groups = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    const list = groups.get(root) ?? [];
    list.push(i);
    groups.set(root, list);
  }

  return Array.from(groups.values()).map((routeIndexes) => {
    let medoidIndex = routeIndexes[0];
    let best = Infinity;
    for (const i of routeIndexes) {
      const total = routeIndexes.reduce((acc, j) => acc + dist[i][j], 0);
      if (total < best) {
        best = total;
        medoidIndex = i;
      }
    }
    return { routeIndexes, medoidIndex };
  });
}
