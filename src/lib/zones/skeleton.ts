/**
 * Morphological thinning using a 4-directional simple-point approach.
 * Input/output are row-major binary masks. Reduces thick blobs to 1-cell-wide
 * 8-connected skeletons while preserving connectivity.
 *
 * Each pass removes border pixels (north, south, west, east) that satisfy
 * the simple-point condition (exactly one 0→1 transition in the circular
 * 8-neighborhood), which guarantees connectivity is preserved at every step.
 */
function getCell(
  out: Uint8Array,
  x: number,
  y: number,
  cols: number,
  rows: number
): number {
  return x < 0 || y < 0 || x >= cols || y >= rows ? 0 : out[y * cols + x];
}

export function thinSkeleton(
  mask: Uint8Array,
  cols: number,
  rows: number
): Uint8Array {
  const out = Uint8Array.from(mask);

  let changed = true;
  while (changed) {
    changed = false;
    // 4-directional passes: N border, S border, W border, E border
    for (const pass of [0, 1, 2, 3] as const) {
      const toClear: number[] = [];
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          if (!out[y * cols + x]) continue;
          const p = [
            getCell(out, x, y - 1, cols, rows),     // N
            getCell(out, x + 1, y - 1, cols, rows), // NE
            getCell(out, x + 1, y, cols, rows),     // E
            getCell(out, x + 1, y + 1, cols, rows), // SE
            getCell(out, x, y + 1, cols, rows),     // S
            getCell(out, x - 1, y + 1, cols, rows), // SW
            getCell(out, x - 1, y, cols, rows),     // W
            getCell(out, x - 1, y - 1, cols, rows), // NW
          ];
          const b = p.reduce((acc, v) => acc + v, 0);
          if (b < 2 || b > 6) continue;
          let transitions = 0;
          for (let i = 0; i < 8; i++) {
            if (!p[i] && p[(i + 1) % 8]) transitions++;
          }
          if (transitions !== 1) continue;
          // Only remove pixels on the border in the current direction
          if (pass === 0 && p[0] !== 0) continue; // N pass: must have N free
          if (pass === 1 && p[4] !== 0) continue; // S pass: must have S free
          if (pass === 2 && p[6] !== 0) continue; // W pass: must have W free
          if (pass === 3 && p[2] !== 0) continue; // E pass: must have E free
          toClear.push(y * cols + x);
        }
      }
      if (toClear.length > 0) {
        changed = true;
        for (const idx of toClear) out[idx] = 0;
      }
    }
  }
  return out;
}
