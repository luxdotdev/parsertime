import {
  MAX_MAIN_LANE_DIST_M,
  PAYLOAD_PROGRESS_BUCKET,
} from "@/lib/zones/constants";

export type ProgressRow = {
  match_time: number;
  mapDataId: number;
  objective_index: number;
  progress: number;
};

export type PositionedEvent = {
  match_time: number;
  mapDataId: number;
  x: number;
  z: number;
};

type Pt = { x: number; z: number };

/**
 * Cross-correlate fight positions with payload progress: each event is
 * assigned the latest progress row before it (same MapData playthrough),
 * bucketed by (objective_index, progress decile); bucket centroids in
 * track order approximate the payload path.
 */
export function tracePayloadPath(
  events: PositionedEvent[],
  progress: ProgressRow[]
): Pt[] {
  const byMap = new Map<number, ProgressRow[]>();
  for (const row of progress) {
    const list = byMap.get(row.mapDataId) ?? [];
    list.push(row);
    byMap.set(row.mapDataId, list);
  }
  for (const list of byMap.values()) {
    list.sort((a, b) => a.match_time - b.match_time);
  }

  const buckets = new Map<number, { sx: number; sz: number; n: number }>();
  for (const event of events) {
    const rows = byMap.get(event.mapDataId);
    if (!rows) continue;
    let lo = 0;
    let hi = rows.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (rows[mid].match_time <= event.match_time) lo = mid + 1;
      else hi = mid;
    }
    if (lo === 0) continue;
    const row = rows[lo - 1];
    const decile = Math.min(
      9,
      Math.floor(row.progress / PAYLOAD_PROGRESS_BUCKET)
    );
    const key = row.objective_index * 1000 + decile;
    const bucket = buckets.get(key) ?? { sx: 0, sz: 0, n: 0 };
    bucket.sx += event.x;
    bucket.sz += event.z;
    bucket.n += 1;
    buckets.set(key, bucket);
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a - b)
    .map(([, b]) => ({ x: b.sx / b.n, z: b.sz / b.n }));
}

function meanDistToLane(path: Pt[], centerline: Pt[]): number {
  let total = 0;
  for (const p of path) {
    let min = Infinity;
    for (const c of centerline) {
      const d = Math.hypot(p.x - c.x, p.z - c.z);
      if (d < min) min = d;
    }
    total += min;
  }
  return total / path.length;
}

/**
 * MAIN = the corridor with the lowest mean distance from path points to
 * its centerline, if within MAX_MAIN_LANE_DIST_M; others FLANK. All null
 * when there is no usable path (point-based maps).
 */
export function labelLanes(
  lanes: { centerline: Pt[] }[],
  path: Pt[]
): ("MAIN" | "FLANK" | null)[] {
  if (path.length < 1 || lanes.length === 0) {
    return lanes.map(() => null);
  }

  const dists = lanes.map((lane) => meanDistToLane(path, lane.centerline));
  let bestIdx = 0;
  for (let i = 1; i < dists.length; i++) {
    if (dists[i] < dists[bestIdx]) bestIdx = i;
  }
  if (dists[bestIdx] > MAX_MAIN_LANE_DIST_M) {
    return lanes.map(() => null);
  }
  return lanes.map((_, i) => (i === bestIdx ? "MAIN" : "FLANK"));
}
