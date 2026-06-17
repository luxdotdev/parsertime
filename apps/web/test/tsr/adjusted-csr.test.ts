import {
  calculateAdjustedCsr,
  getAdjustedCsrTier,
  getAdjustedCsrTierAnchor,
  scaleAdjustedCsrPeerDelta,
} from "@/lib/adjusted-csr";
import { TIER_PRIORS } from "@/lib/tsr/constants";
import { FaceitTier } from "@/generated/prisma/client";
import { describe, expect, it } from "vitest";

describe("adjusted CSR formula", () => {
  it("buckets current TSR into tier anchors", () => {
    expect(getAdjustedCsrTier(2799)).toBe(FaceitTier.OPEN);
    expect(getAdjustedCsrTier(2800)).toBe(FaceitTier.ADVANCED);
    expect(getAdjustedCsrTier(3100)).toBe(FaceitTier.EXPERT);
    expect(getAdjustedCsrTier(3450)).toBe(FaceitTier.MASTERS);
    expect(getAdjustedCsrTier(3850)).toBe(FaceitTier.OWCS);
  });

  it("uses the TSR tier prior as the neutral adjusted CSR", () => {
    expect(getAdjustedCsrTierAnchor(3925)).toBe(TIER_PRIORS.OWCS);
    expect(calculateAdjustedCsr({ tsrRating: 3925, peerZScore: 0 })).toBe(
      TIER_PRIORS.OWCS
    );
  });

  it("compresses peer deltas as z-scores get extreme", () => {
    expect(scaleAdjustedCsrPeerDelta(1)).toBeCloseTo(337.5, 4);
    expect(scaleAdjustedCsrPeerDelta(-1)).toBeCloseTo(-337.5, 4);
    expect(scaleAdjustedCsrPeerDelta(3)).toBeCloseTo(675, 4);
  });

  it("keeps a below-peer OWCS player above the global mean but below the OWCS anchor", () => {
    expect(calculateAdjustedCsr({ tsrRating: 3925, peerZScore: -0.9 })).toBe(
      3538
    );
  });
});
