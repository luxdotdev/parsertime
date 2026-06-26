import type { MapTransform } from "./types";
import { worldToImage } from "./world-to-image";

type AnchorPoint = {
  worldX: number;
  worldY: number;
  imageU: number;
  imageV: number;
};

/**
 * Compute the best-fit affine MapTransform from anchor point correspondences.
 *
 * The forward mapping (world → image) is:
 *   u = a * wx + b * wy + tx
 *   v = c * wx + d * wy + ty
 *
 * This is two independent 3-parameter linear systems (one for u, one for v),
 * each solved via least squares. Requires at least 3 anchor points.
 */
export function computeMapTransform(anchors: AnchorPoint[]): {
  transform: MapTransform;
  residualError: number;
} {
  if (anchors.length < 3) {
    throw new Error("At least 3 anchor points are required");
  }

  // Each system has design matrix row [wx, wy, 1] and A^T A is 3x3.
  // We solve two systems sharing the same A^T A but different right-hand sides.

  const ATA = Array.from({ length: 3 }, () => new Float64Array(3));
  const ATu = new Float64Array(3);
  const ATv = new Float64Array(3);

  for (const { worldX: wx, worldY: wy, imageU: u, imageV: v } of anchors) {
    const row = [wx, wy, 1];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        ATA[i][j] += row[i] * row[j];
      }
      ATu[i] += row[i] * u;
      ATv[i] += row[i] * v;
    }
  }

  // solve3x3 mutates its input, so we need a copy for the second solve
  const ATA2 = ATA.map((row) => Float64Array.from(row));

  const [a, b, tx] = solve3x3(ATA, ATu);
  const [c, d, ty] = solve3x3(ATA2, ATv);

  const transform: MapTransform = { a, b, c, d, tx, ty };

  let totalError = 0;
  for (const anchor of anchors) {
    const predicted = worldToImage(
      { x: anchor.worldX, y: anchor.worldY },
      transform
    );
    const du = predicted.u - anchor.imageU;
    const dv = predicted.v - anchor.imageV;
    totalError += Math.sqrt(du * du + dv * dv);
  }

  return { transform, residualError: totalError / anchors.length };
}

/** Gaussian elimination with partial pivoting for a 3x3 system. Mutates A. */
function solve3x3(
  A: Float64Array[],
  b: Float64Array
): [number, number, number] {
  const n = 3;
  const M = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
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
      throw new Error("Singular matrix — anchor points may be collinear");
    }

    for (let row = col + 1; row < n; row++) {
      const factor = M[row][col] / M[col][col];
      for (let j = col; j <= n; j++) {
        M[row][j] -= factor * M[col][j];
      }
    }
  }

  const x = new Array<number>(n);
  for (let i = n - 1; i >= 0; i--) {
    let sum = M[i][n];
    for (let j = i + 1; j < n; j++) {
      sum -= M[i][j] * x[j];
    }
    x[i] = sum / M[i][i];
  }

  return x as [number, number, number];
}
