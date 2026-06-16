import { computeMapTransform } from "./compute-transform";
import type { MapTransform, PixelAffine } from "./types";

export type RemappableAnchor = {
  id: number;
  worldX: number;
  worldY: number;
  imageU: number;
  imageV: number;
};

export type RemapResult<A extends RemappableAnchor> = {
  anchors: A[];
  transform: MapTransform;
  residualError: number;
};

/** Apply a pixel→pixel affine to a single (u, v). */
export function applyPixelAffine(
  p: PixelAffine,
  u: number,
  v: number
): { u: number; v: number } {
  return { u: p.a * u + p.b * v + p.tx, v: p.c * u + p.d * v + p.ty };
}

/**
 * Move every anchor's pixel coordinates through the old→new pixel transform,
 * keeping its world coordinates fixed, then re-derive the world→image affine
 * from the remapped anchors. Zones need no remapping (they live in world space).
 */
export function remapCalibration<A extends RemappableAnchor>(
  anchors: A[],
  p: PixelAffine
): RemapResult<A> {
  if (anchors.length < 3) {
    throw new Error("At least 3 anchor points are required to remap");
  }

  const remapped = anchors.map((anchor) => {
    const { u, v } = applyPixelAffine(p, anchor.imageU, anchor.imageV);
    return { ...anchor, imageU: u, imageV: v };
  });

  const { transform, residualError } = computeMapTransform(
    remapped.map((a) => ({
      worldX: a.worldX,
      worldY: a.worldY,
      imageU: a.imageU,
      imageV: a.imageV,
    }))
  );

  return { anchors: remapped, transform, residualError };
}
