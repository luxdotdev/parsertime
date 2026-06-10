export type GridSample = { x: number; z: number };

export type GridSpec = {
  minX: number;
  minZ: number;
  cellSize: number;
  cols: number;
  rows: number;
};

export type DensityGrid = {
  spec: GridSpec;
  counts: Float64Array;
};

export function buildDensityGrid(
  samples: GridSample[],
  cellSize: number
): DensityGrid {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const s of samples) {
    if (s.x < minX) minX = s.x;
    if (s.x > maxX) maxX = s.x;
    if (s.z < minZ) minZ = s.z;
    if (s.z > maxZ) maxZ = s.z;
  }
  minX -= cellSize;
  minZ -= cellSize;
  maxX += cellSize;
  maxZ += cellSize;

  const cols = Math.max(1, Math.ceil((maxX - minX) / cellSize));
  const rows = Math.max(1, Math.ceil((maxZ - minZ) / cellSize));
  const spec: GridSpec = { minX, minZ, cellSize, cols, rows };
  const counts = new Float64Array(cols * rows);

  for (const s of samples) {
    const cell = worldToCell(s.x, s.z, spec);
    if (cell) counts[cell.row * cols + cell.col] += 1;
  }
  return { spec, counts };
}

export function worldToCell(
  x: number,
  z: number,
  spec: GridSpec
): { col: number; row: number } | null {
  const col = Math.floor((x - spec.minX) / spec.cellSize);
  const row = Math.floor((z - spec.minZ) / spec.cellSize);
  if (col < 0 || row < 0 || col >= spec.cols || row >= spec.rows) return null;
  return { col, row };
}

export function cellCenterWorld(
  col: number,
  row: number,
  spec: GridSpec
): { x: number; z: number } {
  return {
    x: spec.minX + (col + 0.5) * spec.cellSize,
    z: spec.minZ + (row + 0.5) * spec.cellSize,
  };
}

const BLUR_KERNEL = [1 / 16, 4 / 16, 6 / 16, 4 / 16, 1 / 16] as const;

function blurPass(
  src: Float64Array,
  horizontal: boolean,
  cols: number,
  rows: number
): Float64Array {
  const out = new Float64Array(src.length);
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      let acc = 0;
      for (let k = -2; k <= 2; k++) {
        const c = horizontal
          ? Math.min(cols - 1, Math.max(0, col + k))
          : col;
        const r = horizontal ? row : Math.min(rows - 1, Math.max(0, row + k));
        acc += src[r * cols + c] * BLUR_KERNEL[k + 2];
      }
      out[row * cols + col] = acc;
    }
  }
  return out;
}

/** Separable 5-tap binomial blur ([1,4,6,4,1]/16), edge-clamped. */
export function gaussianBlur(grid: DensityGrid): DensityGrid {
  const { cols, rows } = grid.spec;
  return {
    spec: grid.spec,
    counts: blurPass(blurPass(grid.counts, true, cols, rows), false, cols, rows),
  };
}
