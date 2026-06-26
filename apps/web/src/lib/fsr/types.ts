import type { FaceitRole } from "@/generated/prisma/client";
import { FaceitTier } from "@/generated/prisma/client";

/** The five FACEIT tiers FSR rates (UNCLASSIFIED and CAH are excluded). */
export const ANCHORED_TIERS = [
  FaceitTier.OPEN,
  FaceitTier.ADVANCED,
  FaceitTier.EXPERT,
  FaceitTier.MASTERS,
  FaceitTier.OWCS,
] as const;

export type AnchoredTier = (typeof ANCHORED_TIERS)[number];

/** Stat columns on FaceitMapPlayerStats used by the composites (timePlayed is the denominator). */
export type FsrStatColumn =
  | "eliminations"
  | "finalBlows"
  | "deaths"
  | "damageDealt"
  | "healingDone"
  | "damageMitigated"
  | "soloKills"
  | "assists"
  | "objectiveTime";

export type FsrStatConfig = {
  column: FsrStatColumn;
  weight: number;
  invert?: boolean;
};

/** One (player × role × tier) group row, as returned by the SQL aggregate. */
export type FsrGroupRow = {
  faceitPlayerId: string;
  role: FaceitRole;
  tier: AnchoredTier;
  mapCount: number;
  recentMapCount: number;
  sumRecency: number;
  sumRecencyTime: number;
  weightedSums: Record<FsrStatColumn, number>;
};

export type StatBaseline = { mean: number; stddev: number };
export type CellBaseline = Partial<Record<FsrStatColumn, StatBaseline>>;
