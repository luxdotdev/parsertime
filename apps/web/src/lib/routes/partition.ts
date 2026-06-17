import type { Route } from "@/lib/routes/extract";

export type ObjectiveRoundMark = {
  match_time: number;
  objective_index: number;
};

/**
 * The control-map objective_index active at time `t`: the objective_index of
 * the last RoundStart whose match_time is <= t. Returns null if `t` precedes
 * every round start (no arena is active yet).
 */
export function resolveObjectiveIndex(
  t: number,
  roundStarts: ObjectiveRoundMark[]
): number | null {
  const sorted = [...roundStarts].sort((a, b) => a.match_time - b.match_time);
  let current: number | null = null;
  for (const r of sorted) {
    if (r.match_time <= t) current = r.objective_index;
    else break;
  }
  return current;
}

/** Group routes by the objective_index active at each route's startT. */
export function partitionRoutesByObjective(
  routes: Route[],
  roundStarts: ObjectiveRoundMark[]
): Map<number, Route[]> {
  const byIndex = new Map<number, Route[]>();
  for (const route of routes) {
    const idx = resolveObjectiveIndex(route.startT, roundStarts);
    if (idx == null) continue;
    const arr = byIndex.get(idx) ?? [];
    arr.push(route);
    byIndex.set(idx, arr);
  }
  return byIndex;
}
