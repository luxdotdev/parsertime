export type FunnelEventRow = { userId: string; name: string };

export type FunnelStep = {
  name: string;
  users: number;
  conversion: number; // fraction of the previous step's users (1 for the first step)
};

export type FunnelDef = { key: string; steps: string[] };

// v1 funnel definitions.
export const FUNNELS: FunnelDef[] = [
  {
    key: "activation",
    steps: ["auth.signup", "team.create", "scrim.create", "stats.view"],
  },
];

/**
 * Ordered funnel: a user counts toward step i only if they performed all of
 * steps 0..i (order along the timeline is assumed by row order per user).
 */
export function computeFunnel(
  rows: FunnelEventRow[],
  steps: string[]
): FunnelStep[] {
  const byUser = new Map<string, Set<string>>();
  for (const row of rows) {
    let set = byUser.get(row.userId);
    if (!set) {
      set = new Set();
      byUser.set(row.userId, set);
    }
    set.add(row.name);
  }

  const counts = steps.map(() => 0);
  for (const set of byUser.values()) {
    for (let i = 0; i < steps.length; i++) {
      if (set.has(steps[i]!)) counts[i]! += 1;
      else break; // ordered: stop at the first missing step
    }
  }

  return steps.map((name, i) => ({
    name,
    users: counts[i]!,
    conversion:
      i === 0 ? 1 : counts[i - 1] === 0 ? 0 : counts[i]! / counts[i - 1]!,
  }));
}
