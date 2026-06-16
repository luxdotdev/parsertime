import type { FaceitRole, FaceitTier } from "@/generated/prisma/client";
import type { MapWinrateEntry } from "./types";

export type FaceitPlayerListEntry = {
  faceitPlayerId: string;
  nickname: string;
  battletag: string | null;
  matchCount: number;
  topFsr: number | null; // best headline FSR across roles, for sort/display
};

export type FsrRadarAxis = {
  stat: string; // stat key, e.g. "eliminations"
  z: number; // z-score (inverted stats already oriented so higher = better)
};

export type FsrInsight = {
  stat: string;
  z: number;
  kind: "strength" | "weakness";
};

export type PlayerFsrTierCell = {
  tier: FaceitTier;
  fsr: number;
  mapCount: number;
  minutesPlayed: number;
  percentile: number; // 0..100 within (tier x role)
};

export type PlayerFsrRole = {
  role: FaceitRole;
  fsr: number;
  mapCount: number;
  recentMapCount365d: number;
  primary: boolean; // most maps among the player's roles
  tiers: PlayerFsrTierCell[];
  radar: FsrRadarAxis[]; // from the headline tier's statZ
  strengths: FsrInsight[];
  weaknesses: FsrInsight[];
  headlineTier: FaceitTier | null;
};

export type PlayerRoleUsage = {
  role: FaceitRole;
  mapCount: number;
  share: number; // 0..1
};

export type PlayerMatchHistoryEntry = {
  matchId: string;
  finishedAt: Date;
  tier: FaceitTier;
  teamId: string | null;
  teamName: string | null;
  opponentName: string | null;
  score: string; // "2 - 1"
  won: boolean;
  role: string | null; // modal role that match
};

export type PlayerTeamEntry = {
  faceitTeamId: string;
  name: string;
  appearances: number;
};

export type FaceitPlayerProfile = {
  player: {
    faceitPlayerId: string;
    nickname: string;
    battletag: string | null;
    region: string;
    ow2SkillLevel: number | null;
    verified: boolean;
  };
  rated: boolean; // has at least one PlayerFsr row
  fsrRoles: PlayerFsrRole[]; // empty if unrated
  roleUsage: PlayerRoleUsage[];
  mapWinrates: { byMap: MapWinrateEntry[]; byType: MapWinrateEntry[] };
  matchHistory: PlayerMatchHistoryEntry[];
  teams: PlayerTeamEntry[];
};
