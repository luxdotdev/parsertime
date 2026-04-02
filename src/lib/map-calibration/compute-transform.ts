import type { MapTransform } from "./types";
import { worldToImage } from "./world-to-image";

type AnchorPoint = {
  worldX: number;
  worldY: number;
  imageU: number;
  imageV: number;
};

/**
 * Compute the best-fit MapTransform from anchor point correspondences.
 *
 * The forward mapping (world → image) is:
 *   u =  a * wx - b * wy + cx
 *   v = -b * wx - a * wy + cy
 *
 * where a = scale * cos(θ), b = scale * sin(θ), and the Y-flip is
 * absorbed into the cy offset (v measured from image top).
 *
 * This is a 4-parameter linear system solved via least squares.
 * Requires at least 2 anchor points.
 */
export function computeMapTransform(
  anchors: AnchorPoint[],
  imageHeight: number
): { transform: MapTransform; residualError: number } {
  if (anchors.length < 2) {
    throw new Error("At least 2 anchor points are required");
  }

  // Build the normal equation matrices: A^T A x = A^T b
  // Each anchor gives two equations:
  //   u_i =  a * wx_i - b * wy_i + cx
  //   v_i = -b * wx_i - a * wy_i + cy
  //
  // Unknown vector: [a, b, cx, cy]
  // Row for u: [ wx,  -wy, 1, 0] * [a, b, cx, cy]^T = u
  // Row for v: [-wy, -wx, 0, 1] * [a, b, cx, cy]^T = v

  const n = anchors.length;
  // A^T A is 4x4, A^T b is 4x1
  const ATA = Array.from({ length: 4 }, () => new Float64Array(4));
  const ATb = new Float64Array(4);

  for (const anchor of anchors) {
    const { worldX: wx, worldY: wy, imageU: u, imageV: v } = anchor;

    // Row for u equation: [wx, -wy, 1, 0]
    const r1 = [wx, -wy, 1, 0];
    // Row for v equation: [-wy, -wx, 0, 1]
    const r2 = [-wy, -wx, 0, 1];

    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        ATA[i][j] += r1[i] * r1[j] + r2[i] * r2[j];
      }
      ATb[i] += r1[i] * u + r2[i] * v;
    }
  }

  // Solve 4x4 system via Gaussian elimination with partial pivoting
  const x = solveLinearSystem(ATA, ATb);
  const [a, b, cx, cy] = x;

  // Extract transform parameters
  const scale = Math.sqrt(a * a + b * b);
  const rotation = Math.atan2(b, a);

  // Recover origin from cx, cy:
  // cx = -a * ox + b * oy  →  cx = -(scale*cos*ox) + (scale*sin*oy)
  // cy = b * ox + a * oy + imageHeight
  //    → cy - imageHeight = scale*sin*ox + scale*cos*oy
  //
  // Solving for ox, oy:
  // | -a   b | |ox|   |cx          |
  // |  b   a | |oy| = |cy - imgH   |
  //
  // det = -a^2 - b^2 = -scale^2
  // adjugate: | a  -b |
  //           | -b -a |
  const det = -(a * a + b * b); // = -scale^2
  if (Math.abs(det) < 1e-12) {
    throw new Error(
      "Degenerate anchor configuration — cannot compute transform"
    );
  }
  const rhs1 = cx;
  const rhs2 = cy - imageHeight;
  const originX = (a * rhs1 - b * rhs2) / det;
  const originY = (-b * rhs1 - a * rhs2) / det;

  const transform: MapTransform = {
    origin: { x: originX, y: originY },
    scale,
    rotation,
  };

  // Compute residual error (average pixel distance)
  let totalError = 0;
  for (const anchor of anchors) {
    const predicted = worldToImage(
      { x: anchor.worldX, y: anchor.worldY },
      transform,
      imageHeight
    );
    const du = predicted.u - anchor.imageU;
    const dv = predicted.v - anchor.imageV;
    totalError += Math.sqrt(du * du + dv * dv);
  }
  const residualError = totalError / n;

  return { transform, residualError };
}

/** Gaussian elimination with partial pivoting for a 4x4 system */
function solveLinearSystem(
  A: Float64Array[],
  b: Float64Array
): [number, number, number, number] {
  const n = 4;
  // Augmented matrix
  const M = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    // Partial pivoting
    let maxRow = col;
    let maxVal = Math.abs(M[col][col]);
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row][col]) > maxVal) {
        maxVal = Math.abs(M[row][col]);
        maxRow = row;
      }
    }
    if (maxRow !== col) {
      [M[col], M[maxRow]] = [M[maxRow], M[col]];
    }

    if (Math.abs(M[col][col]) < 1e-12) {
      throw new Error("Singular matrix — anchor points may be degenerate");
    }

    // Eliminate below
    for (let row = col + 1; row < n; row++) {
      const factor = M[row][col] / M[col][col];
      for (let j = col; j <= n; j++) {
        M[row][j] -= factor * M[col][j];
      }
    }
  }

  // Back substitution
  const x = new Array<number>(n);
  for (let i = n - 1; i >= 0; i--) {
    let sum = M[i][n];
    for (let j = i + 1; j < n; j++) {
      sum -= M[i][j] * x[j];
    }
    x[i] = sum / M[i][i];
  }

  return x as [number, number, number, number];
}
