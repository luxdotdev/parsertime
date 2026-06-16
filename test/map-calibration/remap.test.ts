import {
  applyPixelAffine,
  remapCalibration,
} from "@/lib/map-calibration/remap";
import type { MapTransform, PixelAffine } from "@/lib/map-calibration/types";
import { worldToImage } from "@/lib/map-calibration/world-to-image";
import { describe, expect, it } from "vitest";

// Apply a PixelAffine to a pixel.
function applyPixel(p: PixelAffine, u: number, v: number) {
  return { u: p.a * u + p.b * v + p.tx, v: p.c * u + p.d * v + p.ty };
}

describe("remapCalibration", () => {
  it("preserves world→new-image geometry for every anchor", () => {
    // Known world→old-image transform.
    const oldT: MapTransform = {
      a: 2,
      b: 0.1,
      c: -0.05,
      d: 1.8,
      tx: 30,
      ty: 50,
    };
    const worlds = [
      { worldX: 0, worldY: 0 },
      { worldX: 100, worldY: 0 },
      { worldX: 0, worldY: 100 },
      { worldX: 80, worldY: 120 },
    ];
    const anchors = worlds.map((w, i) => {
      const { u, v } = worldToImage({ x: w.worldX, y: w.worldY }, oldT);
      return {
        id: i,
        worldX: w.worldX,
        worldY: w.worldY,
        imageU: u,
        imageV: v,
      };
    });

    // Known old-pixel → new-pixel transform (rotate-ish + scale + shift).
    const P: PixelAffine = {
      a: 0.9,
      b: -0.2,
      c: 0.15,
      d: 1.05,
      tx: -12,
      ty: 8,
    };

    const result = remapCalibration(anchors, P);

    // For every anchor, world→newAffine must equal P(old pixel).
    for (const a of anchors) {
      const expected = applyPixel(P, a.imageU, a.imageV);
      const got = worldToImage({ x: a.worldX, y: a.worldY }, result.transform);
      expect(got.u).toBeCloseTo(expected.u, 4);
      expect(got.v).toBeCloseTo(expected.v, 4);
    }

    // Remapped anchor pixels equal P(old pixel).
    for (let i = 0; i < anchors.length; i++) {
      const expected = applyPixel(P, anchors[i].imageU, anchors[i].imageV);
      expect(result.anchors[i].imageU).toBeCloseTo(expected.u, 6);
      expect(result.anchors[i].imageV).toBeCloseTo(expected.v, 6);
    }
  });

  it("throws when fewer than 3 anchors are present", () => {
    const P: PixelAffine = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };
    expect(() =>
      remapCalibration(
        [
          { id: 1, worldX: 0, worldY: 0, imageU: 1, imageV: 1 },
          { id: 2, worldX: 1, worldY: 0, imageU: 2, imageV: 1 },
        ],
        P
      )
    ).toThrow("At least 3");
  });
});

describe("applyPixelAffine", () => {
  it("identity transform leaves (u, v) unchanged", () => {
    const p = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };
    const result = applyPixelAffine(p, 42, 99);
    expect(result.u).toBeCloseTo(42);
    expect(result.v).toBeCloseTo(99);
  });

  it("non-identity transform produces the expected scalar output", () => {
    // u = 2*10 + 1*20 + 5 = 45
    // v = -1*10 + 3*20 + (-4) = 46
    const p = { a: 2, b: 1, c: -1, d: 3, tx: 5, ty: -4 };
    const result = applyPixelAffine(p, 10, 20);
    expect(result.u).toBeCloseTo(45);
    expect(result.v).toBeCloseTo(46);
  });
});
