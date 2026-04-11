import type { ConfidenceMetadata } from "@/lib/confidence";
import type { DataAvailabilityProfile } from "@/lib/data-availability";
import type { MapType } from "@prisma/client";

// Hero Ban Intelligence types

export type HeroWinRateDelta = {
  hero: string;
  winRateWhenAvailable: number;
  winRateWhenBanned: number;
  delta: number;
  mapsAvailable: number;
  mapsBanned: number;
  confidenceAvailable: ConfidenceMetadata;
  confidenceBanned: ConfidenceMetadata;
};

export type ComfortCrutch = {
  hero: string;
  banFrequency: number;
  totalMaps: number;
  banRate: number;
  winRateDelta: number;
  crutchScore: number;
  confidence: ConfidenceMetadata;
};

export type ProtectedHero = {
  hero: string;
  timesBannedByTeam: number;
  totalMaps: number;
  banRate: number;
};

export type BanRateByMapType = {
  hero: string;
  mapType: MapType;
  banCount: number;
  totalMapsOfType: number;
  banRate: number;
};

export type HeroExposure = {
  hero: string;
  userPlayRate: number;
  userTimePlayed: number;
  opponentBanRate: number;
  opponentBanCount: number;
  exposureRisk: "high" | "medium" | "low";
};

export type BanDisruptionEntry = {
  hero: string;
  winRateDelta: number;
  mapsAvailable: number;
  mapsBanned: number;
  disruptionScore: number;
  confidence: ConfidenceMetadata;
};

export type HeroBanIntelligence = {
  winRateDeltas: HeroWinRateDelta[];
  comfortCrutches: ComfortCrutch[];
  protectedHeroes: ProtectedHero[];
  banRateByMapType: BanRateByMapType[];
  heroExposure: HeroExposure[];
  banDisruptionRanking: BanDisruptionEntry[];
};

// Map Intelligence types

export type StrengthWeightedMapWR = {
  mapName: string;
  mapType: MapType;
  rawWinRate: number;
  strengthWeightedWinRate: number;
  played: number;
  won: number;
  confidence: ConfidenceMetadata;
  strengthRatingAvailable: boolean;
  sources?: { owcsMaps: number; scrimMaps: number };
};

export type MapPerformanceTrend = {
  mapName: string;
  overallWinRate: number;
  recentWinRate: number;
  overallPlayed: number;
  recentPlayed: number;
  delta: number;
  trend: "improving" | "declining" | "stable";
};

export type MapTypeDependency = {
  mapType: MapType;
  played: number;
  won: number;
  winRate: number;
  strengthWeightedWinRate: number;
  confidence: ConfidenceMetadata;
};

export type MapMatchupEntry = {
  mapName: string;
  mapType: MapType;
  userWinRate: number | null;
  userPlayed: number;
  opponentWinRate: number;
  opponentStrengthWeightedWR: number;
  opponentPlayed: number;
  netAdvantage: number | null;
  userConfidence: ConfidenceMetadata;
  opponentConfidence: ConfidenceMetadata;
};

export type MapIntelligence = {
  strengthWeightedWRs: StrengthWeightedMapWR[];
  trends: MapPerformanceTrend[];
  mapTypeDependencies: MapTypeDependency[];
  matchupMatrix: MapMatchupEntry[];
};

// Shared internal types

export type MapWithBans = {
  mapName: string;
  mapType: MapType;
  matchDate: Date;
  teamSide: "team1" | "team2";
  won: boolean;
  heroBans: { team: string; hero: string }[];
  source: "owcs" | "scrim";
};

export type MapResultRow = {
  mapName: string;
  mapType: MapType;
  matchDate: Date;
  team1: string;
  team2: string;
  teamSide: "team1" | "team2";
  winner: string;
};

export type MapResultRowWithSource = MapResultRow & {
  source: "owcs" | "scrim";
};

// Common query options

export type IntelligenceQueryOptions = {
  opponentAbbr: string;
  userTeamId: number | null;
  profile?: DataAvailabilityProfile;
};
