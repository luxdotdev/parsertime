import type { MapTransform, Vec2 } from "./types";

/**
 * Convert a world-space position to image-space pixel coordinates.
 *
 * Pipeline: translate → rotate → scale → flip Y
 */
export function worldToImage(
  pos: Vec2,
  transform: MapTransform,
  imageHeight: number
): { u: number; v: number } {
  // Translate
  const x = pos.x - transform.origin.x;
  const y = pos.y - transform.origin.y;

  // Rotate
  const cos = Math.cos(transform.rotation);
  const sin = Math.sin(transform.rotation);
  const rx = x * cos - y * sin;
  const ry = x * sin + y * cos;

  // Scale + flip Y
  return {
    u: rx * transform.scale,
    v: imageHeight - ry * transform.scale,
  };
}

/**
 * Inverse of worldToImage: convert image-space pixel coordinates back
 * to world-space. Used for determining what world region the image covers.
 */
export function imageToWorld(
  u: number,
  v: number,
  transform: MapTransform,
  imageHeight: number
): Vec2 {
  // Undo scale + flip Y
  const sx = u / transform.scale;
  const sy = (imageHeight - v) / transform.scale;

  // Undo rotation (transpose of rotation matrix)
  const cos = Math.cos(transform.rotation);
  const sin = Math.sin(transform.rotation);
  const x = cos * sx + sin * sy;
  const y = -sin * sx + cos * sy;

  // Undo translation
  return {
    x: x + transform.origin.x,
    y: y + transform.origin.y,
  };
}
