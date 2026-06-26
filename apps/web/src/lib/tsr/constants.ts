import { FaceitTier } from "@/generated/prisma/browser";

export const TIER_PRIORS: Record<FaceitTier, number> = {
  UNCLASSIFIED: 2500,
  OPEN: 2500,
  CAH: 2500,
  ADVANCED: 2800,
  EXPERT: 3100,
  MASTERS: 3450,
  OWCS: 3850,
};

export const TIER_RANK: Record<FaceitTier, number> = {
  UNCLASSIFIED: 0,
  OPEN: 1,
  CAH: 1,
  ADVANCED: 2,
  EXPERT: 3,
  MASTERS: 4,
  OWCS: 5,
};

export const TSR_HARD_FLOOR = 1;
export const TSR_HARD_CEILING = 5000;
export const TSR_SOFT_CAP_START = 4000;

export const RECENCY_HALF_LIFE_DAYS = 365;

export const DISPLAY_MIN_RECENT_MATCHES = 3;
export const DISPLAY_ACTIVITY_WINDOW_DAYS = 365;

export function kBase(matchCount: number): number {
  if (matchCount < 5) return 48;
  if (matchCount < 15) return 32;
  if (matchCount < 30) return 24;
  return 16;
}

export function movMultiplier(
  bestOf: number,
  scoreA: number,
  scoreB: number
): number {
  const maxDiff = Math.ceil(bestOf / 2);
  if (maxDiff <= 0) return 1;
  const actualDiff = Math.abs(scoreA - scoreB);
  const closeness = (maxDiff - actualDiff) / maxDiff;
  return 1.5 - closeness;
}

export function gainDampener(rating: number, deltaSign: number): number {
  if (deltaSign <= 0) return 1;
  if (rating <= TSR_SOFT_CAP_START) return 1;
  const x = (rating - TSR_SOFT_CAP_START) / 1000;
  return Math.max(0, 1 - x * x);
}

export function recencyWeight(ageDays: number): number {
  return Math.pow(0.5, ageDays / RECENCY_HALF_LIFE_DAYS);
}

export function clampRating(x: number): number {
  return Math.max(TSR_HARD_FLOOR, Math.min(TSR_HARD_CEILING, x));
}

export const TIER_FLOOR_MARKERS: {
  tier: FaceitTier;
  floor: number;
  label: string;
}[] = [
  { tier: FaceitTier.OPEN, floor: TIER_PRIORS.OPEN, label: "Open" },
  { tier: FaceitTier.ADVANCED, floor: TIER_PRIORS.ADVANCED, label: "Advanced" },
  { tier: FaceitTier.EXPERT, floor: TIER_PRIORS.EXPERT, label: "Expert" },
  { tier: FaceitTier.MASTERS, floor: TIER_PRIORS.MASTERS, label: "Masters" },
  { tier: FaceitTier.OWCS, floor: TIER_PRIORS.OWCS, label: "OWCS" },
];
