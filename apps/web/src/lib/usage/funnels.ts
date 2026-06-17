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
 * Funnel by step coverage: a user counts toward step i only if they performed
 * every step 0..i (in any order — event sequence is not considered). Counts are
 * therefore monotonic non-increasing. `conversion` is the fraction of the prior
 * step's users (1 for the first step, 0 when the prior step had none).
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
      if (set.has(steps[i])) counts[i] += 1;
      else break; // ordered: stop at the first missing step
    }
  }

  return steps.map((name, i) => ({
    name,
    users: counts[i],
    conversion:
      i === 0 ? 1 : counts[i - 1] === 0 ? 0 : counts[i] / counts[i - 1],
  }));
}
