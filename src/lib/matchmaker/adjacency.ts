import { FaceitTier } from "@prisma/client";

export type Bucket = {
  bracketTier: FaceitTier;
  bracketBand: string | null;
};

const BANDED_TIERS: FaceitTier[] = [
  FaceitTier.OPEN,
  FaceitTier.ADVANCED,
  FaceitTier.EXPERT,
  FaceitTier.MASTERS,
];
const BANDS = ["Low", "Mid", "High"] as const;

// The full ascending ladder: every banded tier × Low/Mid/High, then OWCS
// (no band) at the top.
const LADDER: Bucket[] = [
  ...BANDED_TIERS.flatMap((t) =>
    BANDS.map((b) => ({ bracketTier: t, bracketBand: b }))
  ),
  { bracketTier: FaceitTier.OWCS, bracketBand: null },
];

function indexOf(b: Bucket): number {
  return LADDER.findIndex(
    (x) => x.bracketTier === b.bracketTier && x.bracketBand === b.bracketBand
  );
}

export function sameBucket(a: Bucket, b: Bucket): boolean {
  return a.bracketTier === b.bracketTier && a.bracketBand === b.bracketBand;
}

export function adjacentBuckets(b: Bucket): Bucket[] {
  const i = indexOf(b);
  if (i === -1) return [];
  const out: Bucket[] = [];
  if (i > 0) out.push(LADDER[i - 1]);
  if (i < LADDER.length - 1) out.push(LADDER[i + 1]);
  return out;
}
