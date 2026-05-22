/**
 * Shared rendering primitives for canvas-based positional heatmaps.
 *
 * Pure, browser-only helpers (OKLCH → sRGB, Gaussian density rasterization,
 * ramp interpolation) used by both the map-wide {@link HeatmapCanvas} and the
 * player-scoped telemetry heatmap. Kept framework-free so either canvas can
 * import without pulling in server-only data modules.
 */

export type Ramp = [number, number, number, number][];

/** Downscale factor for the density grid; trades resolution for speed. */
export const DOWNSCALE = 4;
/** Gaussian blur radius (in image pixels) applied around each point. */
export const SIGMA = 20;

/**
 * Parse an `oklch(L C H)` CSS color string into an sRGB triple.
 * Returns null when the value can't be parsed so callers can fall back.
 */
export function parseOklchToRgb(
  value: string
): [number, number, number] | null {
  const match = value.trim().match(/oklch\(\s*([^)]+)\)/i);
  if (!match) return null;
  const parts = match[1].replace(/\//g, " ").split(/[ ,]+/).filter(Boolean);
  if (parts.length < 3) return null;
  const L = parts[0].endsWith("%")
    ? parseFloat(parts[0]) / 100
    : parseFloat(parts[0]);
  const C = parseFloat(parts[1]);
  const H = (parseFloat(parts[2]) * Math.PI) / 180;
  if (!Number.isFinite(L) || !Number.isFinite(C) || !Number.isFinite(H)) {
    return null;
  }
  const a = Math.cos(H) * C;
  const b = Math.sin(H) * C;
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  let r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  let g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  let bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  function toSrgb(c: number) {
    const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    return Math.max(0, Math.min(1, v));
  }
  r = toSrgb(r);
  g = toSrgb(g);
  bl = toSrgb(bl);
  return [Math.round(r * 255), Math.round(g * 255), Math.round(bl * 255)];
}

/**
 * Resolve a color string to sRGB. Accepts `var(--token)` (resolved against the
 * document root), raw `oklch(...)`, or `#rrggbb`. Browser-only.
 */
export function resolveColorToRgb(
  color: string,
  fallback: [number, number, number] = [200, 120, 80]
): [number, number, number] {
  if (typeof window === "undefined") return fallback;
  let value = color.trim();
  if (value.startsWith("var(")) {
    const token = value.slice(4, -1).trim();
    value = getComputedStyle(document.documentElement)
      .getPropertyValue(token)
      .trim();
  }
  if (value.startsWith("oklch")) {
    return parseOklchToRgb(value) ?? fallback;
  }
  const hex = value.match(/^#?([0-9a-f]{6})$/i);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  return fallback;
}

export function interpolateColorWithRamp(
  ramp: Ramp,
  t: number
): [number, number, number, number] {
  const clamped = Math.max(0, Math.min(1, t));
  const idx = clamped * (ramp.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.min(lo + 1, ramp.length - 1);
  const frac = idx - lo;

  return [
    Math.round(ramp[lo][0] + (ramp[hi][0] - ramp[lo][0]) * frac),
    Math.round(ramp[lo][1] + (ramp[hi][1] - ramp[lo][1]) * frac),
    Math.round(ramp[lo][2] + (ramp[hi][2] - ramp[lo][2]) * frac),
    Math.round(ramp[lo][3] + (ramp[hi][3] - ramp[lo][3]) * frac),
  ];
}

/**
 * Perceptual "plasma"-style density ramp: violet at low density through magenta
 * and pink to a pale near-white core. The cool violet/magenta band sits at a
 * usable opacity so it reads as a distinct overlay over warm, light maps (sand,
 * desert) rather than smearing a muddy warm tint, while the bright core marks
 * true hotspots. One ramp is used for every density metric; the active toggle
 * and label say which metric it is.
 */
export const HEATMAP_RAMP: Ramp = [
  [42, 22, 110, 0],
  [108, 42, 180, 165],
  [178, 42, 156, 205],
  [224, 56, 112, 230],
  [248, 132, 74, 244],
  [253, 235, 172, 255],
];

/**
 * Rasterize a set of image-space points into a Gaussian density {@link ImageData}
 * colored by `ramp`. Returns null when there is nothing to draw.
 */
export function buildHeatmapImageData(
  points: { u: number; v: number }[],
  imageWidth: number,
  imageHeight: number,
  ramp: Ramp,
  threshold = 0.05
): ImageData | null {
  if (typeof ImageData === "undefined") return null;
  if (points.length === 0) return null;

  const gw = Math.ceil(imageWidth / DOWNSCALE);
  const gh = Math.ceil(imageHeight / DOWNSCALE);
  const sigma = SIGMA / DOWNSCALE;
  const sigma2 = 2 * sigma * sigma;
  const radius = Math.ceil(sigma * 3);

  const density = new Float32Array(gw * gh);

  for (const pt of points) {
    const gx = pt.u / DOWNSCALE;
    const gy = pt.v / DOWNSCALE;
    const x0 = Math.max(0, Math.floor(gx - radius));
    const x1 = Math.min(gw - 1, Math.ceil(gx + radius));
    const y0 = Math.max(0, Math.floor(gy - radius));
    const y1 = Math.min(gh - 1, Math.ceil(gy + radius));

    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = x - gx;
        const dy = y - gy;
        density[y * gw + x] += Math.exp(-(dx * dx + dy * dy) / sigma2);
      }
    }
  }

  let maxDensity = 0;
  for (const d of density) {
    if (d > maxDensity) maxDensity = d;
  }
  if (maxDensity === 0) return null;

  const imgData = new ImageData(gw, gh);
  const data = imgData.data;

  for (let i = 0; i < density.length; i++) {
    const t = density[i] / maxDensity;
    if (t < threshold) continue;
    const [r, g, b, a] = interpolateColorWithRamp(ramp, t);
    const off = i * 4;
    data[off] = r;
    data[off + 1] = g;
    data[off + 2] = b;
    data[off + 3] = a;
  }

  return imgData;
}
