/** Two events join the same engagement when within BOTH epsilons. */
export const ENGAGEMENT_RADIUS_M = 25;
export const ENGAGEMENT_GAP_SEC = 15;
/** Clusters smaller than this are noise, not fights. */
export const MIN_ENGAGEMENT_EVENTS = 8;

export type EngagementEvent = {
  match_time: number;
  x: number;
  z: number;
  kind: "kill" | "damage";
  attackerTeam: string;
  attackerName: string;
  victimTeam: string;
  victimName: string;
};

export type Engagement = {
  start: number;
  end: number;
  centroid: { x: number; z: number };
  participants: string[];
  killsByTeam: Record<string, number>;
  winner: string | null;
};

/**
 * Space+time DBSCAN-style clustering. Greedy BFS over events sorted by
 * time; neighbor search only scans the temporal window (sorted input),
 * so complexity is O(n · window) not O(n²). Drifting fights chain by
 * design. Clusters need MIN_ENGAGEMENT_EVENTS events and >= 1 kill.
 */
export function clusterEngagements(events: EngagementEvent[]): Engagement[] {
  const sorted = [...events].sort((a, b) => a.match_time - b.match_time);
  const clusterOf = new Int32Array(sorted.length).fill(-1);
  let nextCluster = 0;

  function lowerBound(t: number): number {
    let lo = 0;
    let hi = sorted.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (sorted[mid].match_time < t) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  for (let i = 0; i < sorted.length; i++) {
    if (clusterOf[i] !== -1) continue;
    const clusterId = nextCluster++;
    clusterOf[i] = clusterId;
    const queue = [i];
    while (queue.length > 0) {
      const cur = queue.pop()!;
      const e = sorted[cur];
      const from = lowerBound(e.match_time - ENGAGEMENT_GAP_SEC);
      for (let j = from; j < sorted.length; j++) {
        const other = sorted[j];
        if (other.match_time > e.match_time + ENGAGEMENT_GAP_SEC) break;
        if (clusterOf[j] !== -1) continue;
        if (Math.hypot(other.x - e.x, other.z - e.z) <= ENGAGEMENT_RADIUS_M) {
          clusterOf[j] = clusterId;
          queue.push(j);
        }
      }
    }
  }

  const groups = new Map<number, EngagementEvent[]>();
  for (let i = 0; i < sorted.length; i++) {
    const list = groups.get(clusterOf[i]) ?? [];
    list.push(sorted[i]);
    groups.set(clusterOf[i], list);
  }

  const engagements: Engagement[] = [];
  for (const group of groups.values()) {
    if (group.length < MIN_ENGAGEMENT_EVENTS) continue;
    const kills = group.filter((e) => e.kind === "kill");
    if (kills.length === 0) continue;

    const killsByTeam: Record<string, number> = {};
    for (const k of kills) {
      killsByTeam[k.attackerTeam] = (killsByTeam[k.attackerTeam] ?? 0) + 1;
    }
    const teams = Object.entries(killsByTeam).sort((a, b) => b[1] - a[1]);
    const winner =
      teams.length === 1 || teams[0][1] > teams[1][1] ? teams[0][0] : null;

    const participants = [
      ...new Set(group.flatMap((e) => [e.attackerName, e.victimName])),
    ];

    engagements.push({
      start: group[0].match_time,
      end: group[group.length - 1].match_time,
      centroid: {
        x: group.reduce((a, e) => a + e.x, 0) / group.length,
        z: group.reduce((a, e) => a + e.z, 0) / group.length,
      },
      participants,
      killsByTeam,
      winner,
    });
  }
  return engagements.sort((a, b) => a.start - b.start);
}
