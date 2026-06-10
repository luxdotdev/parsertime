import {
  CENTERLINE_DECIMATE,
  LANE_MASK_FRACTION,
  MAX_LANE_WIDTH_M,
  MAX_LANES,
  MIN_LANE_LENGTH_M,
  MIN_LANE_WIDTH_M,
} from "@/lib/zones/constants";
import type { Vertex } from "@/lib/zones/geometry";
import type { DensityGrid, GridSpec } from "@/lib/zones/grid";
import { cellCenterWorld } from "@/lib/zones/grid";
import { thinSkeleton } from "@/lib/zones/skeleton";

export type Lane = {
  centerline: { x: number; z: number }[];
  polygon: Vertex[];
};

/**
 * Threshold the blurred grid into a mask, thin to a skeleton, extract up
 * to MAX_LANES longest corridor paths, buffer each by local ridge width.
 */
export function extractLanes(grid: DensityGrid): Lane[] {
  const { cols, rows, cellSize } = grid.spec;
  let max = 0;
  for (const v of grid.counts) {
    if (v > max) max = v;
  }
  if (max === 0) return [];
  const threshold = max * LANE_MASK_FRACTION;

  const laneMask = new Uint8Array(grid.counts.length);
  for (let i = 0; i < grid.counts.length; i++) {
    if (grid.counts[i] >= threshold) laneMask[i] = 1;
  }

  const skeleton = thinSkeleton(laneMask, cols, rows);
  const minCells = Math.ceil(MIN_LANE_LENGTH_M / cellSize);

  const lanes: Lane[] = [];
  const remaining = Uint8Array.from(skeleton);
  for (let i = 0; i < MAX_LANES; i++) {
    const path = longestPath(remaining, cols, rows);
    if (!path || path.length < minCells) break;
    for (const idx of path) {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const r = row + dr;
          const c = col + dc;
          if (r < 0 || c < 0 || r >= rows || c >= cols) continue;
          remaining[r * cols + c] = 0;
        }
      }
    }
    const centerline = decimate(path).map((idx) => {
      const center = cellCenterWorld(idx % cols, Math.floor(idx / cols), grid.spec);
      return { x: center.x, z: center.z };
    });
    const polygon = bufferCenterline(centerline, grid, threshold);
    if (polygon.length >= 3) lanes.push({ centerline, polygon });
  }
  return lanes;
}

function decimate(path: number[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < path.length; i += CENTERLINE_DECIMATE) out.push(path[i]);
  if (out[out.length - 1] !== path[path.length - 1]) {
    out.push(path[path.length - 1]);
  }
  return out;
}

function bfsFarthest(
  start: number,
  grid: Uint8Array,
  cols: number,
  rows: number,
  component: Set<number> | undefined
): { farthest: number; parent: Map<number, number> } {
  const parent = new Map<number, number>();
  const queue = [start];
  const seen = new Set([start]);
  let last = start;
  while (queue.length > 0) {
    const idx = queue.shift()!;
    last = idx;
    component?.add(idx);
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const r = row + dr;
        const c = col + dc;
        if (r < 0 || c < 0 || r >= rows || c >= cols) continue;
        const n = r * cols + c;
        if (!grid[n] || seen.has(n)) continue;
        seen.add(n);
        parent.set(n, idx);
        queue.push(n);
      }
    }
  }
  return { farthest: last, parent };
}

/**
 * Longest path across all 8-connected components, via the double-BFS
 * tree-diameter heuristic (exact on trees; skeletons are near-trees).
 */
function longestPath(
  grid: Uint8Array,
  cols: number,
  rows: number
): number[] | null {
  const visited = new Uint8Array(grid.length);
  let best: number[] | null = null;

  for (let i = 0; i < grid.length; i++) {
    if (!grid[i] || visited[i]) continue;
    const component = new Set<number>();
    const { farthest: a } = bfsFarthest(i, grid, cols, rows, component);
    for (const idx of component) visited[idx] = 1;
    const { farthest: b, parent } = bfsFarthest(a, grid, cols, rows, undefined);
    const path: number[] = [];
    let cur: number | undefined = b;
    while (cur !== undefined) {
      path.push(cur);
      cur = parent.get(cur);
    }
    if (!best || path.length > best.length) best = path;
  }
  return best;
}

function densityAt(
  x: number,
  z: number,
  counts: Float64Array,
  spec: GridSpec
): number {
  const col = Math.floor((x - spec.minX) / spec.cellSize);
  const row = Math.floor((z - spec.minZ) / spec.cellSize);
  if (col < 0 || row < 0 || col >= spec.cols || row >= spec.rows) {
    return 0;
  }
  return counts[row * spec.cols + col];
}

function marchHalfWidth(
  px: number,
  pz: number,
  nx: number,
  nz: number,
  sign: 1 | -1,
  counts: Float64Array,
  spec: GridSpec,
  threshold: number
): number {
  let dist = MIN_LANE_WIDTH_M / 2;
  while (dist < MAX_LANE_WIDTH_M / 2) {
    if (densityAt(px + sign * nx * dist, pz + sign * nz * dist, counts, spec) < threshold) {
      break;
    }
    dist += spec.cellSize / 2;
  }
  return dist;
}

/**
 * Buffer a centerline into a corridor polygon. Width at each point is
 * found by marching perpendicular to the local direction until density
 * drops below the lane threshold, clamped to [MIN, MAX] lane width.
 */
function bufferCenterline(
  centerline: { x: number; z: number }[],
  grid: DensityGrid,
  threshold: number
): Vertex[] {
  if (centerline.length < 2) return [];
  const left: Vertex[] = [];
  const right: Vertex[] = [];

  for (let i = 0; i < centerline.length; i++) {
    const prev = centerline[Math.max(0, i - 1)];
    const next = centerline[Math.min(centerline.length - 1, i + 1)];
    const dx = next.x - prev.x;
    const dz = next.z - prev.z;
    const len = Math.hypot(dx, dz) || 1;
    const nx = -dz / len;
    const nz = dx / len;
    const p = centerline[i];

    const lw = marchHalfWidth(p.x, p.z, nx, nz, 1, grid.counts, grid.spec, threshold);
    const rw = marchHalfWidth(p.x, p.z, nx, nz, -1, grid.counts, grid.spec, threshold);

    left.push([p.x + nx * lw, p.z + nz * lw]);
    right.push([p.x - nx * rw, p.z - nz * rw]);
  }
  return [...left, ...right.reverse()];
}
