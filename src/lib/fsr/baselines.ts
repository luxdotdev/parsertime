import { ALL_FSR_STAT_COLUMNS } from "@/lib/fsr/config";
import { statPer10 } from "@/lib/fsr/formula";
import type {
  CellBaseline,
  FsrGroupRow,
  FsrStatColumn,
} from "@/lib/fsr/types";
import type { FaceitRole, FaceitTier } from "@/generated/prisma/client";

export function baselineKey(tier: FaceitTier, role: FaceitRole): string {
  return `${tier}:${role}`;
}

export type BaselineCell = {
  tier: FaceitTier;
  role: FaceitRole;
  sampleN: number;
  baseline: CellBaseline;
};

/** Per-stat per-10 vector for a group. */
export function groupPer10(group: FsrGroupRow): Record<FsrStatColumn, number> {
  const out: Record<FsrStatColumn, number> = {
    eliminations: 0,
    finalBlows: 0,
    deaths: 0,
    damageDealt: 0,
    healingDone: 0,
    damageMitigated: 0,
    soloKills: 0,
    assists: 0,
    objectiveTime: 0,
  };
  for (const col of ALL_FSR_STAT_COLUMNS) {
    out[col] = statPer10(group.weightedSums[col], group.sumRecencyTime);
  }
  return out;
}

function sampleStddev(values: number[], mean: number): number {
  if (values.length < 2) return 0;
  const variance =
    values.reduce((s, v) => s + (v - mean) * (v - mean), 0) /
    (values.length - 1);
  return Math.sqrt(variance);
}

/**
 * Compute (tier × role) per-stat baselines from group rows, using only groups
 * that meet the min-maps threshold (low-sample players shouldn't move the mean).
 */
export function computeBaselines(
  groups: FsrGroupRow[],
  minMaps: number
): Map<string, BaselineCell> {
  const buckets = new Map<string, FsrGroupRow[]>();
  for (const g of groups) {
    if (g.mapCount < minMaps) continue;
    const key = baselineKey(g.tier, g.role);
    const arr = buckets.get(key) ?? [];
    arr.push(g);
    buckets.set(key, arr);
  }

  const result = new Map<string, BaselineCell>();
  for (const [key, members] of buckets) {
    if (members.length === 0) continue;
    const first = members[0];
    const per10s = members.map(groupPer10);
    const baseline: CellBaseline = {};
    for (const col of ALL_FSR_STAT_COLUMNS) {
      const vals = per10s.map((p) => p[col]);
      const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
      baseline[col] = { mean, stddev: sampleStddev(vals, mean) };
    }
    result.set(key, {
      tier: first.tier,
      role: first.role,
      sampleN: members.length,
      baseline,
    });
  }
  return result;
}
