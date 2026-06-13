import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { loadFsrGroups } from "@/lib/fsr/aggregate";
import { baselineKey, computeBaselines, groupPer10 } from "@/lib/fsr/baselines";
import {
  FSR_MIN_MAPS_PER_CELL,
  FSR_RECENT_WINDOW_DAYS,
  FSR_SHRINKAGE_K,
} from "@/lib/fsr/constants";
import {
  blendHeadline,
  compositeZScore,
  tierCellFsr,
  zScore,
} from "@/lib/fsr/formula";
import { ALL_FSR_STAT_COLUMNS, getFsrStatConfigs } from "@/lib/fsr/config";
import type { FsrStatColumn } from "@/lib/fsr/types";
import type { Prisma } from "@/generated/prisma/client";

export type FsrRecomputeResult = {
  groupsLoaded: number;
  cellsWritten: number;
  playersWritten: number;
  baselinesWritten: number;
  staleRowsDropped: number;
  durationMs: number;
  skipped?: boolean;
};

const FSR_RECOMPUTE_LOCK_ID = 732402;

export async function recomputeAllFsr(): Promise<FsrRecomputeResult> {
  const lockStart = Date.now();
  const [lock] = await prisma.$queryRaw<{ locked: boolean }[]>`
    SELECT pg_try_advisory_lock(${FSR_RECOMPUTE_LOCK_ID}) AS locked
  `;
  if (!lock?.locked) {
    const durationMs = Date.now() - lockStart;
    Logger.info({ event: "fsr.recompute", outcome: "skipped_locked", duration_ms: durationMs });
    return {
      groupsLoaded: 0,
      cellsWritten: 0,
      playersWritten: 0,
      baselinesWritten: 0,
      staleRowsDropped: 0,
      durationMs,
      skipped: true,
    };
  }
  try {
    return await recomputeAllFsrUnlocked();
  } finally {
    await prisma.$executeRaw`SELECT pg_advisory_unlock(${FSR_RECOMPUTE_LOCK_ID})`;
  }
}

async function recomputeAllFsrUnlocked(): Promise<FsrRecomputeResult> {
  const start = Date.now();
  const now = new Date();
  const recentCutoff = new Date(now.getTime() - FSR_RECENT_WINDOW_DAYS * 86400 * 1000);

  const groups = await loadFsrGroups(now, recentCutoff);
  const baselines = computeBaselines(groups, FSR_MIN_MAPS_PER_CELL);

  type Cell = {
    faceitPlayerId: string;
    role: (typeof groups)[number]["role"];
    tier: (typeof groups)[number]["tier"];
    fsr: number;
    compositeZ: number;
    mapCount: number;
    recentMapCount: number;
    minutesPlayed: number;
    peerCount: number;
    sumRecency: number;
    statZ: Record<string, number>;
  };

  const cells: Cell[] = [];
  for (const g of groups) {
    if (g.mapCount < FSR_MIN_MAPS_PER_CELL) continue;
    const cell = baselines.get(baselineKey(g.tier, g.role));
    if (!cell) continue;
    const per10 = groupPer10(g);
    const configs = getFsrStatConfigs(g.role);
    const statZ: Record<string, number> = {};
    const zByStat: Partial<Record<FsrStatColumn, number>> = {};
    for (const col of ALL_FSR_STAT_COLUMNS) {
      const base = cell.baseline[col];
      const cfg = configs.find((c) => c.column === col);
      const z = base ? zScore(per10[col], base.mean, base.stddev, cfg?.invert ?? false) : 0;
      zByStat[col] = z;
      statZ[col] = Math.round(z * 1000) / 1000;
    }
    const composite = compositeZScore(zByStat, configs, g.mapCount, FSR_SHRINKAGE_K);
    cells.push({
      faceitPlayerId: g.faceitPlayerId,
      role: g.role,
      tier: g.tier,
      fsr: tierCellFsr(g.tier, composite),
      compositeZ: composite,
      mapCount: g.mapCount,
      recentMapCount: g.recentMapCount,
      minutesPlayed: Math.round((g.sumRecencyTime / 60) * 10) / 10,
      peerCount: cell.sampleN,
      sumRecency: g.sumRecency,
      statZ,
    });
  }

  type HeadlineAcc = {
    cells: { tier: Cell["tier"]; compositeZ: number; sumRecency: number }[];
    mapCount: number;
    recentMapCount: number;
    tiers: Set<Cell["tier"]>;
  };
  const byPlayerRole = new Map<string, HeadlineAcc>();
  for (const c of cells) {
    const key = `${c.faceitPlayerId}:${c.role}`;
    const acc =
      byPlayerRole.get(key) ??
      { cells: [], mapCount: 0, recentMapCount: 0, tiers: new Set() };
    acc.cells.push({ tier: c.tier, compositeZ: c.compositeZ, sumRecency: c.sumRecency });
    acc.mapCount += c.mapCount;
    acc.recentMapCount += c.recentMapCount;
    acc.tiers.add(c.tier);
    byPlayerRole.set(key, acc);
  }

  const computedAt = now;

  const baselineList = [...baselines.values()];

  const baselineData = baselineList.map((b) => ({
    tier: b.tier,
    role: b.role,
    sampleN: b.sampleN,
    stats: b.baseline as unknown as Prisma.InputJsonValue,
    computedAt,
  }));

  const cellData = cells.map((c) => ({
    faceitPlayerId: c.faceitPlayerId,
    role: c.role,
    tier: c.tier,
    fsr: c.fsr,
    compositeZ: c.compositeZ,
    mapCount: c.mapCount,
    minutesPlayed: c.minutesPlayed,
    peerCount: c.peerCount,
    statZ: c.statZ as unknown as Prisma.InputJsonValue,
    computedAt,
  }));

  const headlineEntries = [...byPlayerRole.entries()];
  const playerData = headlineEntries.map(([key, acc]) => {
    const [faceitPlayerId, role] = key.split(":") as [string, Cell["role"]];
    const blend = blendHeadline(acc.cells);
    return {
      faceitPlayerId,
      role,
      fsr: blend.fsr,
      compositeZ: blend.zBlend,
      effectiveAnchor: blend.anchor,
      mapCount: acc.mapCount,
      recentMapCount365d: acc.recentMapCount,
      tiersPlayed: [...acc.tiers],
      computedAt,
    };
  });

  // Chunk so each createMany stays under Postgres' 65,535-parameter limit
  // (rows × columns). Largest table has 10 columns, so 2,000 rows ≈ 20k params.
  const WRITE_CHUNK = 2000;
  function chunkRows<T>(rows: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
    return out;
  }

  // Full-replace inside one interactive transaction: a failure rolls back and
  // leaves the previous (stale-but-valid) rows intact, so readers never see an
  // empty table. createMany issues one bulk INSERT per chunk (few round-trips).
  await prisma.$transaction(
    async (tx) => {
      await tx.fsrBaseline.deleteMany({});
      if (baselineData.length > 0) {
        await tx.fsrBaseline.createMany({ data: baselineData });
      }
      await tx.playerFsrTier.deleteMany({});
      for (const slice of chunkRows(cellData, WRITE_CHUNK)) {
        await tx.playerFsrTier.createMany({ data: slice });
      }
      await tx.playerFsr.deleteMany({});
      for (const slice of chunkRows(playerData, WRITE_CHUNK)) {
        await tx.playerFsr.createMany({ data: slice });
      }
    },
    { timeout: 120_000 }
  );

  const cellsWritten = cellData.length;
  const playersWritten = playerData.length;
  const staleRowsDropped = 0; // full-replace in-transaction; no separate stale sweep

  const durationMs = Date.now() - start;
  Logger.info({
    event: "fsr.recompute",
    outcome: "success",
    groups_loaded: groups.length,
    cells_written: cellsWritten,
    players_written: playersWritten,
    baselines_written: baselineList.length,
    stale_rows_dropped: staleRowsDropped,
    duration_ms: durationMs,
  });

  return {
    groupsLoaded: groups.length,
    cellsWritten,
    playersWritten,
    baselinesWritten: baselineList.length,
    staleRowsDropped,
    durationMs,
  };
}
