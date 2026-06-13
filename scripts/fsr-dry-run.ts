#!/usr/bin/env bun
/**
 * Read-only FSR dry run. Loads the aggregate groups from the live DB, computes
 * baselines + per-tier cells + headlines in memory, and prints leaderboards.
 * Writes nothing. Use this to validate and tune the stat weights / constants
 * before the first real recompute.
 *
 * Usage: bun scripts/fsr-dry-run.ts [headlineLimit]
 */
import { loadFsrGroups } from "../src/lib/fsr/aggregate";
import { baselineKey, computeBaselines, groupPer10 } from "../src/lib/fsr/baselines";
import { ALL_FSR_STAT_COLUMNS, getFsrStatConfigs } from "../src/lib/fsr/config";
import { FSR_MIN_MAPS_PER_CELL, FSR_SHRINKAGE_K } from "../src/lib/fsr/constants";
import { blendHeadline, compositeZScore, zScore } from "../src/lib/fsr/formula";
import type { AnchoredTier, FsrStatColumn } from "../src/lib/fsr/types";

type HeadlineCell = { tier: AnchoredTier; compositeZ: number; sumRecency: number };

async function main() {
  const limit = Number(process.argv[2] ?? 25);
  const now = new Date();
  const recentCutoff = new Date(now.getTime() - 365 * 86400 * 1000);

  const groups = await loadFsrGroups(now, recentCutoff);
  console.log(`Loaded ${groups.length} (player x role x tier) groups`);

  const baselines = computeBaselines(groups, FSR_MIN_MAPS_PER_CELL);
  console.log("Baseline cells (tier x role -> sampleN):");
  for (const [key, cell] of baselines) console.log(`  ${key}: ${cell.sampleN}`);

  const headlineByKey = new Map<string, { cells: HeadlineCell[]; maps: number }>();
  for (const g of groups) {
    if (g.mapCount < FSR_MIN_MAPS_PER_CELL) continue;
    const cell = baselines.get(baselineKey(g.tier, g.role));
    if (!cell) continue;
    const per10 = groupPer10(g);
    const configs = getFsrStatConfigs(g.role);
    const zByStat: Partial<Record<FsrStatColumn, number>> = {};
    for (const col of ALL_FSR_STAT_COLUMNS) {
      const base = cell.baseline[col];
      const cfg = configs.find((c) => c.column === col);
      zByStat[col] = base ? zScore(per10[col], base.mean, base.stddev, cfg?.invert ?? false) : 0;
    }
    const composite = compositeZScore(zByStat, configs, g.mapCount, FSR_SHRINKAGE_K);
    const key = `${g.faceitPlayerId}:${g.role}`;
    const acc = headlineByKey.get(key) ?? { cells: [], maps: 0 };
    acc.cells.push({ tier: g.tier, compositeZ: composite, sumRecency: g.sumRecency });
    acc.maps += g.mapCount;
    headlineByKey.set(key, acc);
  }

  const headlines = [...headlineByKey.entries()].map(([key, acc]) => {
    const [pid, role] = key.split(":");
    return { pid, role, maps: acc.maps, ...blendHeadline(acc.cells) };
  });
  headlines.sort((a, b) => b.fsr - a.fsr);

  console.log(`\nTop ${limit} headline FSR:`);
  for (const h of headlines.slice(0, limit)) {
    console.log(
      `  ${h.fsr}  ${h.role.padEnd(7)} maps=${String(h.maps).padStart(4)} anchor=${h.anchor} z=${h.zBlend.toFixed(2)}  ${h.pid}`
    );
  }
}

main()
  .catch((e) => console.error("ERR", e instanceof Error ? e.message : e))
  .finally(() => process.exit(0));
