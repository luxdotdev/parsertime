import type { MapTransform, Vec2 } from "./types";

/**
 * Convert a world-space position to image-space pixel coordinates
 * using the affine transform coefficients.
 *
 *   u = a * wx + b * wy + tx
 *   v = c * wx + d * wy + ty
 */
export function worldToImage(
  pos: Vec2,
  t: MapTransform
): { u: number; v: number } {
  return {
    u: t.a * pos.x + t.b * pos.y + t.tx,
    v: t.c * pos.x + t.d * pos.y + t.ty,
  };
}

/**
 * Inverse of worldToImage: convert image-space pixel coordinates
 * back to world-space.
 *
 * Solves the 2x2 system:
 *   | a  b | |wx|   | u - tx |
 *   | c  d | |wy| = | v - ty |
 */
export function imageToWorld(u: number, v: number, t: MapTransform): Vec2 {
  const det = t.a * t.d - t.b * t.c;
  const ru = u - t.tx;
  const rv = v - t.ty;
  return {
    x: (t.d * ru - t.b * rv) / det,
    y: (-t.c * ru + t.a * rv) / det,
  };
}
