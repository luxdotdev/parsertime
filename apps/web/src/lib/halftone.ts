export type Dot = { cx: number; cy: number; r: number };

export type HalftoneOptions = {
  /** Number of dot columns sampled across the image width. */
  cols: number;
  /** Spacing between dot centers, in SVG units. */
  cell: number;
  /** Max dot radius as a fraction of half the cell (0..1). */
  maxRadius: number;
  /** Luminance (0..1) at/above which a cell is background (no dot). */
  threshold: number;
};

/** Relative luminance 0..1 from 8-bit sRGB channels. */
export function luminance(r: number, g: number, b: number): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

// Rounds an SVG coordinate to 1 decimal place to keep the generated markup
// compact. Deliberately distinct from `@/lib/utils#round` (2 dp + epsilon),
// which is tuned for displayed numbers rather than path data.
function roundCoord(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Sample a raw pixel buffer into halftone dots. Dark, opaque pixels become
 * large dots; pixels lighter than `threshold` (or transparent) become no dot.
 * `channels` is 3 (RGB) or 4 (RGBA).
 */
export function sampleDots(
  pixels: Uint8Array | Buffer,
  width: number,
  height: number,
  channels: number,
  opts: HalftoneOptions
): Dot[] {
  const { cols, cell, maxRadius, threshold } = opts;
  const step = Math.max(1, Math.floor(width / cols)); // source px per cell
  const half = step >> 1;
  const dots: Dot[] = [];

  for (let gy = 0; gy * step < height; gy++) {
    for (let gx = 0; gx * step < width; gx++) {
      const px = Math.min(width - 1, gx * step + half);
      const py = Math.min(height - 1, gy * step + half);
      const i = (py * width + px) * channels;

      const alpha = channels === 4 ? pixels[i + 3] / 255 : 1;
      if (alpha === 0) continue;

      const lum = luminance(pixels[i], pixels[i + 1], pixels[i + 2]);
      if (lum >= threshold) continue;

      const darkness = alpha * (1 - lum); // 0 (light) .. 1 (black)
      const r = darkness * (cell / 2) * maxRadius;
      if (r <= 0) continue;

      dots.push({ cx: gx * cell + cell / 2, cy: gy * cell + cell / 2, r });
    }
  }

  return dots;
}

/** Render dots to an inline SVG string. viewBox is derived from dot extents. */
export function renderHalftoneSvg(dots: Dot[]): string {
  const head = '<svg xmlns="http://www.w3.org/2000/svg"';
  const attrs = 'fill="currentColor" aria-hidden="true"';

  if (dots.length === 0) {
    return `${head} viewBox="0 0 1 1" ${attrs}></svg>`;
  }

  let maxX = 0;
  let maxY = 0;
  for (const d of dots) {
    maxX = Math.max(maxX, d.cx + d.r);
    maxY = Math.max(maxY, d.cy + d.r);
  }

  const circles = dots
    .map(
      (d) =>
        `<circle cx="${roundCoord(d.cx)}" cy="${roundCoord(d.cy)}" r="${roundCoord(d.r)}"/>`
    )
    .join("");

  return `${head} viewBox="0 0 ${roundCoord(maxX)} ${roundCoord(maxY)}" ${attrs}>${circles}</svg>`;
}
