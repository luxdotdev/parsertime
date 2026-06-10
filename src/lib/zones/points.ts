import {
  GRID_CELL_SIZE_M,
  MAX_POINT_AREA_M2,
  MIN_POINT_AREA_M2,
  MIN_POINT_PEAK,
  MIN_POINT_SAMPLES,
  POINT_CONTOUR_FRACTION,
} from "@/lib/zones/constants";
import { convexHull, polygonArea, type Vertex } from "@/lib/zones/geometry";
import {
  buildDensityGrid,
  cellCenterWorld,
  gaussianBlur,
  type GridSample,
} from "@/lib/zones/grid";

/**
 * Density peak → flood fill at a fraction of the peak → convex hull.
 * Returns null when any quality bar fails (silence beats garbage).
 */
export function extractPointPolygon(samples: GridSample[]): Vertex[] | null {
  if (samples.length < MIN_POINT_SAMPLES) return null;

  const grid = gaussianBlur(buildDensityGrid(samples, GRID_CELL_SIZE_M));
  const { cols, rows } = grid.spec;

  let peakIdx = 0;
  for (let i = 1; i < grid.counts.length; i++) {
    if (grid.counts[i] > grid.counts[peakIdx]) peakIdx = i;
  }
  const peak = grid.counts[peakIdx];
  if (peak < MIN_POINT_PEAK) return null;

  const threshold = peak * POINT_CONTOUR_FRACTION;
  const visited = new Uint8Array(grid.counts.length);
  const stack = [peakIdx];
  visited[peakIdx] = 1;
  const cells: number[] = [];
  while (stack.length > 0) {
    const idx = stack.pop()!;
    cells.push(idx);
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const neighbors = [
      [col - 1, row],
      [col + 1, row],
      [col, row - 1],
      [col, row + 1],
    ];
    for (const [c, r] of neighbors) {
      if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
      const nIdx = r * cols + c;
      if (visited[nIdx] || grid.counts[nIdx] < threshold) continue;
      visited[nIdx] = 1;
      stack.push(nIdx);
    }
  }

  const points: Vertex[] = cells.map((idx) => {
    const center = cellCenterWorld(idx % cols, Math.floor(idx / cols), grid.spec);
    return [center.x, center.z];
  });
  const hull = convexHull(points);
  if (hull.length < 3) return null;

  const area = polygonArea(hull);
  if (area < MIN_POINT_AREA_M2 || area > MAX_POINT_AREA_M2) return null;

  return hull;
}
