import type { MapType } from "@/generated/prisma/client";

export type MatchResult = "win" | "loss";

export type ScoutingTeam = {
  abbreviation: string;
  fullName: string;
  matchCount: number;
  winCount: number;
};

export type ScoutingTeamOverview = {
  totalMatches: number;
  wins: number;
  losses: number;
  winRate: number;
  weightedWinRate: number;
  recentForm: MatchResult[];
};

export type HeroBanEntry = {
  hero: string;
  rawCount: number;
  weightedCount: number;
};

export type ScoutingHeroBans = {
  bansByTeam: HeroBanEntry[];
  bansAgainstTeam: HeroBanEntry[];
};

export type MapPerformanceEntry = {
  name: string;
  played: number;
  won: number;
  winRate: number;
  weightedWinRate: number;
};

export type ScoutingMapAnalysis = {
  byMap: MapPerformanceEntry[];
  byMapType: (MapPerformanceEntry & { mapType: MapType })[];
};

export type ScoutingMatchHistoryEntry = {
  date: Date;
  opponent: string;
  opponentFullName: string;
  teamScore: number | null;
  opponentScore: number | null;
  result: MatchResult;
  tournament: string;
};

export type ScoutingRecommendation = {
  name: string;
  reason: string;
  weightedWinRate: number;
  sampleSize: number;
};

export type ScoutingRecommendations = {
  suggestedBans: ScoutingRecommendation[];
  suggestedMapPicks: ScoutingRecommendation[];
  suggestedMapAvoids: ScoutingRecommendation[];
};

export type ScoutingTeamProfile = {
  team: { abbreviation: string; fullName: string };
  overview: ScoutingTeamOverview;
  heroBans: ScoutingHeroBans;
  mapAnalysis: ScoutingMapAnalysis;
  matchHistory: ScoutingMatchHistoryEntry[];
  recommendations: ScoutingRecommendations;
};

export type TeamStrengthRating = {
  teamAbbr: string;
  fullName: string;
  rating: number;
  matchesRated: number;
  ratingHistory: { date: Date; rating: number }[];
};

/** A single OWCS roster player resolved onto the corroborated FACEIT team. */
export type FaceitLinkPlayer = {
  owcsName: string;
  faceitNickname: string;
  /** Headline FACEIT skill rating (role with the most maps), null if unrated. */
  fsr: number | null;
};

/**
 * A confidence-gated bridge from an OWCS team to a FACEIT team. Built only when
 * several of the OWCS roster's handles co-resolve to FACEIT players who have
 * actually played together on one FACEIT team — never asserted as identity.
 * Adds an individual-skill signal (FSR) the OWCS data alone cannot provide.
 */
export type FaceitTeamLink = {
  faceitTeamId: string;
  faceitTeamName: string;
  /** OWCS roster size for this team (the denominator for the match). */
  rosterSize: number;
  /** The corroborating overlap — roster players found on the FACEIT team. */
  sharedPlayers: FaceitLinkPlayer[];
  /** Mean FSR across shared players that carry one (whole number), or null. */
  aggregateFsr: number | null;
  /** How many shared players carried an FSR (coverage for the aggregate). */
  fsrCovered: number;
};
