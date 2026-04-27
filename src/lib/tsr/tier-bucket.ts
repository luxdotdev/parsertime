import { TIER_FLOOR_MARKERS } from "@/lib/tsr/breakdown";
import { FaceitTier } from "@prisma/client";

export type TierBand = "Low" | "Mid" | "High";

export type TierBucket = {
  tier: FaceitTier;
  band: TierBand | null;
  label: string;
};

// Bucket a TSR rating into a "Low/Mid/High Tier" recommendation. Below
// OPEN returns a sub-tier label; OWCS skips the band split because the
// tier is open-ended on the high side.
export function getTierBucket(rating: number): TierBucket {
  const floors = TIER_FLOOR_MARKERS;
  const first = floors[0];
  if (rating < first.floor) {
    return { tier: FaceitTier.UNCLASSIFIED, band: null, label: `Below ${first.label}` };
  }
  let idx = 0;
  for (let i = 0; i < floors.length; i++) {
    if (rating >= floors[i].floor) idx = i;
  }
  const start = floors[idx];
  const next = floors[idx + 1];
  if (!next) {
    return { tier: start.tier, band: null, label: start.label };
  }
  const pos = (rating - start.floor) / (next.floor - start.floor);
  const band: TierBand = pos < 1 / 3 ? "Low" : pos < 2 / 3 ? "Mid" : "High";
  return { tier: start.tier, band, label: `${band} ${start.label}` };
}
