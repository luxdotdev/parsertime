import { thinSkeleton } from "@/lib/zones/skeleton";
import { expect, test } from "vitest";

function mask(rows: string[]): { mask: Uint8Array; cols: number; rows: number } {
  const cols = rows[0].length;
  const m = new Uint8Array(cols * rows.length);
  rows.forEach((line, r) => {
    for (let c = 0; c < cols; c++) if (line[c] === "#") m[r * cols + c] = 1;
  });
  return { mask: m, cols, rows: rows.length };
}

test("a thick horizontal bar thins to a single-cell line", () => {
  const { mask: m, cols, rows } = mask([
    "..........",
    ".########.",
    ".########.",
    ".########.",
    "..........",
  ]);
  const thin = thinSkeleton(m, cols, rows);
  for (let c = 1; c <= 8; c++) {
    let count = 0;
    for (let r = 0; r < rows; r++) count += thin[r * cols + c];
    expect(count).toBe(1);
  }
});

test("thinning preserves connectivity of an L shape", () => {
  const { mask: m, cols, rows } = mask([
    ".....",
    ".###.",
    ".###.",
    ".##..",
    ".##..",
    ".....",
  ]);
  const thin = thinSkeleton(m, cols, rows);
  const on = [];
  for (let i = 0; i < thin.length; i++) if (thin[i]) on.push(i);
  expect(on.length).toBeGreaterThan(1);
  const seen = new Set([on[0]]);
  const stack = [on[0]];
  while (stack.length) {
    const idx = stack.pop()!;
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const r = row + dr;
        const c = col + dc;
        if (r < 0 || c < 0 || r >= rows || c >= cols) continue;
        const n = r * cols + c;
        if (thin[n] && !seen.has(n)) {
          seen.add(n);
          stack.push(n);
        }
      }
    }
  }
  expect(seen.size).toBe(on.length);
});
