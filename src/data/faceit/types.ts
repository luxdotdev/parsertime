import type { FaceitTier } from "@/generated/prisma/client";

export type FaceitRoleKey = "TANK" | "DAMAGE" | "SUPPORT";

/** Search-list entry. */
export type FaceitTeamListEntry = {
  faceitTeamId: string;
  name: string;
  matchCount: number;
};

/** Normalized per-map row the pure aggregations consume (one row per map the team played). */
export type FaceitTeamMapRow = {
  matchId: string;
  finishedAt: Date;
  tier: FaceitTier;
  teamSide: number; // 1 | 2
  mapName: string | null;
  mapType: string | null; // MapType enum value, kept loose for aggregation
  won: boolean; // winnerFaction === teamSide
  attackedFirst: boolean | null; // attackingFirstFaction === `faction${teamSide}`; null if unknown
  heroBans: string[]; // hero names in the ban pool for this map
};

/** Normalized per-match row (for record/form/weighted winrate). */
export type FaceitTeamMatchRow = {
  matchId: string;
  finishedAt: Date;
  tier: FaceitTier;
  won: boolean;
};

export type FaceitTeamOverview = {
  totalMatches: number;
  wins: number;
  losses: number;
  winRate: number; // percent
  weightedWinRate: number; // percent, recency-decayed
  recentForm: ("win" | "loss")[]; // most-recent-first, up to 10
  tierCounts: Record<string, number>; // tier -> match count
};

export type MapWinrateEntry = {
  key: string; // map name or map type
  played: number;
  won: number;
  winRate: number;
  weightedWinRate: number;
  rated: boolean; // played >= MIN_SAMPLE
};

export type AttackDefenseSplit = {
  attackPlayed: number;
  attackWon: number;
  attackWinRate: number;
  defensePlayed: number;
  defenseWon: number;
  defenseWinRate: number;
};

export type FaceitMapAnalysis = {
  byMap: MapWinrateEntry[];
  byType: MapWinrateEntry[];
  attackDefense: AttackDefenseSplit;
};

export type HeroBanEnvironmentEntry = {
  hero: string;
  bannedPlayed: number;
  bannedWon: number;
  bannedWinRate: number;
  notBannedPlayed: number;
  notBannedWon: number;
  notBannedWinRate: number;
  delta: number; // notBannedWinRate - bannedWinRate (positive => weaker when hero is banned)
  rated: boolean; // both arms >= MIN_SAMPLE
};

export type FaceitRosterPlayer = {
  faceitPlayerId: string;
  nickname: string;
  battletag: string | null;
  role: FaceitRoleKey | null;
  appearances: number;
  appearanceShare: number; // 0..1 of the team's matches
  starter: boolean; // appearanceShare >= STARTER_SHARE
  fsr: number | null;
  tsr: number | null;
};

export type RosterStrength = {
  fsr: number | null; // role-weighted mean of starters' FSR, null if none rated
  tsr: number | null;
  fsrCovered: number; // # starters with an FSR
  tsrCovered: number;
  rosterSize: number;
};

export type RelatedTeam = {
  faceitTeamId: string;
  name: string;
  matchCount: number;
  sharedCorePlayers: number;
};

export type FaceitRecommendation = {
  kind: "map_pick" | "map_avoid" | "ban_hero" | "do_not_ban_hero";
  subject: string; // map name or hero name
  metric: number; // winrate or delta used for ranking
  sample: number;
  // map_pick / map_avoid:
  winRate?: number;
  played?: number;
  // ban_hero / do_not_ban_hero:
  bannedWinRate?: number;
  notBannedWinRate?: number;
  bannedSample?: number;
  notBannedSample?: number;
};

export type FaceitTeamProfile = {
  team: { faceitTeamId: string; name: string };
  combined: boolean;
  includedTeamIds: string[];
  overview: FaceitTeamOverview;
  strength: RosterStrength;
  mapAnalysis: FaceitMapAnalysis;
  heroBanEnvironment: HeroBanEnvironmentEntry[];
  roster: FaceitRosterPlayer[];
  relatedTeams: RelatedTeam[];
  recommendations: FaceitRecommendation[];
};
