import {
  blendHeadline,
  clampFsr,
  compositeZScore,
  shrink,
  statPer10,
  tierCellFsr,
  zScore,
} from "@/lib/fsr/formula";
import { FaceitTier } from "@/generated/prisma/client";
import { describe, expect, it } from "vitest";

describe("FSR formula", () => {
  it("computes recency-weighted per-10 rates", () => {
    expect(statPer10(300, 1800)).toBeCloseTo(100, 6);
    expect(statPer10(0, 0)).toBe(0);
  });

  it("z-scores with inversion and zero-stddev guard", () => {
    expect(zScore(5, 3, 2, false)).toBeCloseTo(1, 6);
    expect(zScore(5, 3, 2, true)).toBeCloseTo(-1, 6);
    expect(zScore(5, 3, 0, false)).toBe(0);
  });

  it("shrinks toward zero for small samples", () => {
    expect(shrink(8, 8)).toBeCloseTo(0.5, 6);
    expect(shrink(24, 8)).toBeCloseTo(0.75, 6);
  });

  it("builds a shrunk role-weighted composite", () => {
    const z = compositeZScore(
      { eliminations: 1.0, deaths: 0.5 },
      [
        { column: "eliminations", weight: 0.3 },
        { column: "deaths", weight: 0.2, invert: true },
      ],
      8,
      8
    );
    expect(z).toBeCloseTo(0.2, 6);
  });

  it("anchors a tier cell at the tier prior plus a scaled peer delta", () => {
    expect(tierCellFsr(FaceitTier.OPEN, 1.0)).toBe(2838);
    expect(tierCellFsr(FaceitTier.OPEN, 0)).toBe(2500);
  });

  it("clamps FSR into [1, 5000]", () => {
    expect(clampFsr(-5)).toBe(1);
    expect(clampFsr(99999)).toBe(5000);
    expect(clampFsr(2837.5)).toBe(2838);
  });

  it("blends a level-aware headline across tiers", () => {
    const result = blendHeadline([
      { tier: FaceitTier.OPEN, compositeZ: 1.0, sumRecency: 10 },
      { tier: FaceitTier.EXPERT, compositeZ: 0.0, sumRecency: 10 },
    ]);
    expect(result.anchor).toBe(2860);
    expect(result.zBlend).toBeCloseTo(0.4, 6);
    expect(result.fsr).toBe(3019);
  });
});
