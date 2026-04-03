export type Vec2 = { x: number; y: number };

/**
 * 2D affine transform: u = a*wx + b*wy + tx, v = c*wx + d*wy + ty
 *
 * No assumptions about axis direction — the solver determines the
 * correct mapping from anchor point correspondences.
 */
export type MapTransform = {
  a: number;
  b: number;
  c: number;
  d: number;
  tx: number;
  ty: number;
};
