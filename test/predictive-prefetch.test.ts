import { describe, expect, it } from "vitest";
import {
  estimateVelocity,
  isHeadingToward,
  type HeadingOptions,
} from "@/lib/predictive-prefetch";

const OPTS: HeadingOptions = {
  maxDistance: 250,
  coneAngleDeg: 30,
  minSpeed: 0.15,
};

// A 20x20 link box centered at (cx, cy).
function boxAt(cx: number, cy: number) {
  return { left: cx - 10, top: cy - 10, width: 20, height: 20 };
}

describe("estimateVelocity", () => {
  it("computes px/ms from oldest and newest sample", () => {
    const v = estimateVelocity([
      { x: 0, y: 0, t: 0 },
      { x: 10, y: 0, t: 100 },
    ]);
    expect(v.x).toBeCloseTo(0.1, 6);
    expect(v.y).toBeCloseTo(0, 6);
  });

  it("preserves direction sign across both axes", () => {
    const v = estimateVelocity([
      { x: 0, y: 0, t: 0 },
      { x: -20, y: 40, t: 100 },
    ]);
    expect(v.x).toBeCloseTo(-0.2, 6);
    expect(v.y).toBeCloseTo(0.4, 6);
  });

  it("returns zero for fewer than two samples", () => {
    expect(estimateVelocity([])).toEqual({ x: 0, y: 0 });
    expect(estimateVelocity([{ x: 5, y: 5, t: 10 }])).toEqual({ x: 0, y: 0 });
  });

  it("returns zero when no time elapsed", () => {
    expect(
      estimateVelocity([
        { x: 0, y: 0, t: 50 },
        { x: 10, y: 0, t: 50 },
      ])
    ).toEqual({ x: 0, y: 0 });
  });
});

describe("isHeadingToward", () => {
  it("fires for a link straight ahead within range", () => {
    expect(
      isHeadingToward({ x: 0, y: 0 }, { x: 0.5, y: 0 }, boxAt(110, 0), OPTS)
    ).toBe(true);
  });

  it("rejects a link behind the cursor", () => {
    expect(
      isHeadingToward({ x: 0, y: 0 }, { x: -0.5, y: 0 }, boxAt(110, 0), OPTS)
    ).toBe(false);
  });

  it("rejects a link beyond maxDistance", () => {
    expect(
      isHeadingToward({ x: 0, y: 0 }, { x: 0.5, y: 0 }, boxAt(300, 0), OPTS)
    ).toBe(false);
  });

  it("rejects when speed is below minSpeed", () => {
    expect(
      isHeadingToward({ x: 0, y: 0 }, { x: 0.05, y: 0 }, boxAt(110, 0), OPTS)
    ).toBe(false);
  });

  it("rejects a heading outside the cone (45deg at a head-on link)", () => {
    expect(
      isHeadingToward({ x: 0, y: 0 }, { x: 1, y: 1 }, boxAt(100, 0), OPTS)
    ).toBe(false);
  });

  it("fires for a heading inside the cone (~20deg)", () => {
    const rad = (20 * Math.PI) / 180;
    expect(
      isHeadingToward(
        { x: 0, y: 0 },
        { x: Math.cos(rad), y: Math.sin(rad) },
        boxAt(100, 0),
        OPTS
      )
    ).toBe(true);
  });
});
