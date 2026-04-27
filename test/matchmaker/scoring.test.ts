import { describe, expect, it } from "vitest";
import { scoreCandidate } from "@/lib/matchmaker/candidates";
import { FaceitTier, TsrRegion } from "@prisma/client";

const searcher = {
  rating: 3300,
  region: TsrRegion.NA,
  bracketTier: FaceitTier.MASTERS,
  bracketBand: "Mid",
};

describe("scoreCandidate", () => {
  it("identical candidate (region match, same bracket, 0 delta) scores positive", () => {
    const s = scoreCandidate(searcher, {
      rating: 3300,
      region: TsrRegion.NA,
      bracketTier: FaceitTier.MASTERS,
      bracketBand: "Mid",
      cooldownActive: false,
      overlapHours: 0,
    });
    expect(s).toBeCloseTo(2.5, 4);
  });

  it("cooldown subtracts 2.0", () => {
    const s = scoreCandidate(searcher, {
      rating: 3300,
      region: TsrRegion.NA,
      bracketTier: FaceitTier.MASTERS,
      bracketBand: "Mid",
      cooldownActive: true,
      overlapHours: 0,
    });
    expect(s).toBeCloseTo(0.5, 4);
  });

  it("availability overlap adds (12h/168 * 0.3 ≈ 0.0214)", () => {
    const s = scoreCandidate(searcher, {
      rating: 3300,
      region: TsrRegion.NA,
      bracketTier: FaceitTier.MASTERS,
      bracketBand: "Mid",
      cooldownActive: false,
      overlapHours: 12,
    });
    expect(s).toBeCloseTo(2.5 + (0.3 * 12) / 168, 4);
  });

  it("region mismatch costs 1.0", () => {
    const s = scoreCandidate(searcher, {
      rating: 3300,
      region: TsrRegion.EMEA,
      bracketTier: FaceitTier.MASTERS,
      bracketBand: "Mid",
      cooldownActive: false,
      overlapHours: 0,
    });
    expect(s).toBeCloseTo(1.5, 4);
  });

  it("adjacent bracket scores 1.0 (0.5 * 2) instead of 1.5 (0.5 * 3)", () => {
    const s = scoreCandidate(searcher, {
      rating: 3000,
      region: TsrRegion.NA,
      bracketTier: FaceitTier.MASTERS,
      bracketBand: "Low",
      cooldownActive: false,
      overlapHours: 0,
    });
    expect(s).toBeCloseTo(1.55, 4);
  });

  it("non-adjacent, far bracket gets 0 bracket score", () => {
    const s = scoreCandidate(searcher, {
      rating: 2200,
      region: TsrRegion.NA,
      bracketTier: FaceitTier.OPEN,
      bracketBand: "Mid",
      cooldownActive: false,
      overlapHours: 0,
    });
    expect(s).toBeCloseTo(-0.65, 4);
  });

  it("cooldown still leaves close candidates above bad far candidates", () => {
    const closeCooled = scoreCandidate(searcher, {
      rating: 3300,
      region: TsrRegion.NA,
      bracketTier: FaceitTier.MASTERS,
      bracketBand: "Mid",
      cooldownActive: true,
      overlapHours: 0,
    });
    const farFresh = scoreCandidate(searcher, {
      rating: 1500,
      region: TsrRegion.EMEA,
      bracketTier: FaceitTier.OPEN,
      bracketBand: "Low",
      cooldownActive: false,
      overlapHours: 0,
    });
    expect(closeCooled).toBeGreaterThan(farFresh);
  });
});
