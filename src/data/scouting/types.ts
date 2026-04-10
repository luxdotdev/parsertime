import type { MapType } from "@prisma/client";

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
