import { recencyWeight, TIER_PRIORS } from "@/lib/tsr/constants";
import { scaleAdjustedCsrPeerDelta } from "@/lib/adjusted-csr";
import type { AnchoredTier } from "@/lib/fsr/types";
import { FaceitTier } from "@/generated/prisma/client";

/** Per-player map-count threshold for a tier cell to be rated. Tunable. */
export const FSR_MIN_MAPS_PER_CELL = 8;

/** Shrinkage constant: composite is multiplied by n/(n+K). Tunable. */
export const FSR_SHRINKAGE_K = 8;

/** Days within which a map counts toward recentMapCount365d. */
export const FSR_RECENT_WINDOW_DAYS = 365;

const TIER_WEIGHTS: Record<AnchoredTier, number> = {
  [FaceitTier.OPEN]: 1.0,
  [FaceitTier.ADVANCED]: 1.25,
  [FaceitTier.EXPERT]: 1.5,
  [FaceitTier.MASTERS]: 1.75,
  [FaceitTier.OWCS]: 2.0,
};

export function tierWeight(tier: AnchoredTier): number {
  return TIER_WEIGHTS[tier];
}

// Re-export the shared numeric machinery so FSR stays consistent with TSR/adjusted-CSR.
export { recencyWeight, TIER_PRIORS, scaleAdjustedCsrPeerDelta };
