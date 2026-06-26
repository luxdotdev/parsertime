import { round } from "@/lib/utils";
import {
  buildDensityGrid,
  cellCenterWorld,
  gaussianBlur,
  worldToCell,
  type DensityGrid,
} from "@/lib/zones/grid";

/** Field grid cell edge (meters) — coarser than zones; fights are sparse. */
export const FIELD_CELL_SIZE_M = 8;
/**
 * Blurred win+loss density a cell needs before the field has an opinion.
 * Calibration note: after separable 2D blur a single fight contributes
 * only ~0.14 to its own cell, so 0.35 ≈ "two or three fights nearby".
 */
export const FIELD_MIN_SUPPORT = 0.35;
/** Below this many pooled decisive fights, no field is built at all. */
export const FIELD_MIN_TOTAL_FIGHTS = 10;
/** Raw fights within CALLOUT_RADIUS_M a callout candidate needs. */
export const CALLOUT_MIN_FIGHTS = 5;
export const CALLOUT_RADIUS_M = 15;
/** Two callouts of the same polarity must be at least this far apart. */
export const CALLOUT_MIN_SEPARATION_M = 30;
/** Winrate fences: a "strongest" area must clear 55%, a "weakest" sit under 45%. */
export const CALLOUT_STRONG_MIN = 55;
export const CALLOUT_WEAK_MAX = 45;
export const CALLOUTS_PER_POLARITY = 2;

export type FightPoint = { x: number; z: number; won: boolean };

export type FieldCell = {
  x: number;
  z: number;
  winrate: number; // 0..100
  support: number; // blurred fight density
};

export type FieldCallout = {
  x: number;
  z: number;
  won: number; // raw fights within CALLOUT_RADIUS_M
  lost: number;
  winrate: number; // raw, 0..100
  polarity: "strong" | "weak";
};

export type FightField = {
  cells: FieldCell[];
  callouts: FieldCallout[];
  totalFights: number;
  overallWinrate: number; // 0..100, decisive fights only
};

function rawCounts(
  points: FightPoint[],
  x: number,
  z: number,
  radius: number
): { won: number; lost: number } {
  let won = 0;
  let lost = 0;
  for (const p of points) {
    if (Math.hypot(p.x - x, p.z - z) > radius) continue;
    if (p.won) won++;
    else lost++;
  }
  return { won, lost };
}

/**
 * Diverging fight-winrate field: win and loss densities share one grid
 * spec, are blurred separately, and combine into per-cell winrate gated
 * by support. Cells where nothing happened simply don't exist — the
 * field never has an opinion without data.
 */
export function buildFightField(points: FightPoint[]): FightField | null {
  if (points.length < FIELD_MIN_TOTAL_FIGHTS) return null;

  const base = buildDensityGrid(points, FIELD_CELL_SIZE_M);
  const { spec } = base;
  const winCounts = new Float64Array(spec.cols * spec.rows);
  const lossCounts = new Float64Array(spec.cols * spec.rows);
  for (const p of points) {
    const cell = worldToCell(p.x, p.z, spec);
    if (!cell) continue;
    const idx = cell.row * spec.cols + cell.col;
    if (p.won) winCounts[idx] += 1;
    else lossCounts[idx] += 1;
  }
  const winGrid: DensityGrid = gaussianBlur({ spec, counts: winCounts });
  const lossGrid: DensityGrid = gaussianBlur({ spec, counts: lossCounts });

  const cells: FieldCell[] = [];
  for (let row = 0; row < spec.rows; row++) {
    for (let col = 0; col < spec.cols; col++) {
      const idx = row * spec.cols + col;
      const w = winGrid.counts[idx];
      const l = lossGrid.counts[idx];
      const support = w + l;
      if (support < FIELD_MIN_SUPPORT) continue;
      const center = cellCenterWorld(col, row, spec);
      cells.push({
        x: center.x,
        z: center.z,
        winrate: round((w / support) * 100),
        support,
      });
    }
  }

  const totalWon = points.filter((p) => p.won).length;

  function pickCallouts(polarity: "strong" | "weak"): FieldCallout[] {
    const candidates = cells
      .map((cell) => {
        const counts = rawCounts(points, cell.x, cell.z, CALLOUT_RADIUS_M);
        const decisive = counts.won + counts.lost;
        if (decisive < CALLOUT_MIN_FIGHTS) return null;
        const winrate = round((counts.won / decisive) * 100);
        if (polarity === "strong" && winrate < CALLOUT_STRONG_MIN) return null;
        if (polarity === "weak" && winrate > CALLOUT_WEAK_MAX) return null;
        return { x: cell.x, z: cell.z, ...counts, winrate, polarity };
      })
      .filter((c): c is FieldCallout => c !== null)
      .sort((a, b) =>
        polarity === "strong"
          ? b.winrate - a.winrate || b.won + b.lost - (a.won + a.lost)
          : a.winrate - b.winrate || b.won + b.lost - (a.won + a.lost)
      );

    const picked: FieldCallout[] = [];
    for (const candidate of candidates) {
      if (picked.length >= CALLOUTS_PER_POLARITY) break;
      const tooClose = picked.some(
        (p) =>
          Math.hypot(p.x - candidate.x, p.z - candidate.z) <
          CALLOUT_MIN_SEPARATION_M
      );
      if (!tooClose) picked.push(candidate);
    }
    return picked;
  }

  return {
    cells,
    callouts: [...pickCallouts("strong"), ...pickCallouts("weak")],
    totalFights: points.length,
    overallWinrate: round((totalWon / points.length) * 100),
  };
}
