import type { ConfidenceMetadata } from "@/lib/confidence";
import type { PlayerTarget } from "@prisma/client";
import { Schema as S } from "effect";

export type MostPlayedHeroRow = {
  player_name: string;
  player_team: string;
  player_hero: string;
  hero_time_played: number;
};

export type ScoutingPlayerSummary = {
  id: number;
  name: string;
  team: string;
  role: string;
  region: string;
  status: string;
  slug: string;
};

export type HeroFrequency = {
  hero: string;
  mapCount: number;
};

export type TournamentMatchEntry = {
  date: Date;
  opponent: string;
  opponentFullName: string;
  teamScore: number | null;
  opponentScore: number | null;
  result: "win" | "loss";
  heroesPlayed: string[];
};

export type TournamentRecord = {
  tournamentTitle: string;
  teamName: string;
  role: string;
  wins: number;
  losses: number;
  winRate: number;
  matches: TournamentMatchEntry[];
};

export type PlayerProfile = {
  id: number;
  name: string;
  team: string;
  status: string;
  role: string;
  country: string;
  signatureHeroes: string[];
  winnings: number;
  region: string;
  playerUrl: string;
  slug: string;
  heroFrequencies: HeroFrequency[];
  competitiveMapCount: number;
  tournamentRecords: TournamentRecord[];
  totalTournaments: number;
};

export type { ValidStatColumn } from "@/lib/stat-percentiles";

export type HeroStatZScore = {
  stat: string;
  per10: number;
  zScore: number | null;
  heroAvgPer10: number;
  heroStdPer10: number;
  sampleSize: number;
};

export type ScoutingHeroPerformance = {
  hero: string;
  role: "Tank" | "Damage" | "Support";
  mapsPlayed: number;
  totalTimePlayed: number;
  stats: HeroStatZScore[];
  compositeZScore: number;
};

export type AdvancedMetrics = {
  mvpScore: number;
  fletaDeadliftPercentage: number;
  firstPickPercentage: number;
  firstPickCount: number;
  firstDeathPercentage: number;
  firstDeathCount: number;
  fightReversalPercentage: number;
  killsPerUltimate: number;
  averageUltChargeTime: number;
  averageDroughtTime: number;
  duelWinratePercentage: number;
  consistencyScore: number;
};

export type KillPatterns = {
  topHeroesEliminated: { hero: string; count: number }[];
  topHeroesDiedTo: { hero: string; count: number }[];
  killMethods: { method: string; count: number }[];
};

export type RoleDistributionEntry = {
  role: string;
  timePlayed: number;
  percentage: number;
};

export type AccuracyStats = {
  weaponAccuracy: number;
  criticalHitAccuracy: number;
  scopedAccuracy: number;
};

export type MapWinrateEntry = {
  mapName: string;
  mapType: string;
  wins: number;
  losses: number;
  winRate: number;
  played: number;
};

export type MapTypeWinrateEntry = {
  mapType: string;
  wins: number;
  losses: number;
  winRate: number;
  played: number;
};

export type CompetitiveMapWinrates = {
  byMapType: MapTypeWinrateEntry[];
  byMap: MapWinrateEntry[];
};

export type ScrimMapWinrates = {
  byMap: { mapName: string; wins: number; losses: number; winRate: number }[];
};

export type ScrimData = {
  available: true;
  mapsPlayed: number;
  totalTimePlayed: number;
  heroes: ScoutingHeroPerformance[];
  advancedMetrics: AdvancedMetrics;
  killPatterns: KillPatterns;
  roleDistribution: RoleDistributionEntry[];
  accuracy: AccuracyStats;
  kdRatio: number;
  eliminationsPer10: number;
  deathsPer10: number;
  heroDamagePer10: number;
  healingDealtPer10: number;
};

export type InsightItem = {
  category: "hero" | "map" | "stat" | "combat";
  label: string;
  detail: string;
  value: number;
};

export type PlayerScoutingAnalytics = {
  scrimData: ScrimData | null;
  competitiveMapWinrates: CompetitiveMapWinrates;
  scrimMapWinrates: ScrimMapWinrates | null;
  strengths: InsightItem[];
  weaknesses: InsightItem[];
};

export type { ConfidenceMetadata } from "@/lib/confidence";

export type PlayerHeroZScore = {
  hero: string;
  role: "Tank" | "Damage" | "Support";
  compositeZScore: number;
  mapsPlayed: number;
  totalTimePlayed: number;
  isPrimary: boolean;
};

export type PlayerHeroDepth = {
  playerName: string;
  role: "Tank" | "Damage" | "Support";
  heroes: PlayerHeroZScore[];
  primarySecondaryDelta: number | null;
  heroPoolSize: number;
  confidence: ConfidenceMetadata;
};

export type HeroSubstitutionRate = {
  playerName: string;
  primaryHero: string;
  totalMaps: number;
  mapsOnPrimary: number;
  mapsForced: number;
  substitutionRate: number;
  performanceDelta: number | null;
};

export type PlayerVulnerability = {
  playerName: string;
  role: "Tank" | "Damage" | "Support";
  primaryHero: string;
  heroDepthDelta: number;
  opponentBanRate: number;
  opponentBanCount: number;
  vulnerabilityIndex: number;
  riskLevel: "critical" | "high" | "moderate" | "low";
};

export type BestPlayerHighlight = {
  playerName: string;
  role: "Tank" | "Damage" | "Support";
  primaryHero: string;
  compositeZScore: number;
  mapsPlayed: number;
  isTargetedByBans: boolean;
  banTargetRate: number;
};

export type PlayerIntelligence = {
  playerDepths: PlayerHeroDepth[];
  substitutionRates: HeroSubstitutionRate[];
  vulnerabilities: PlayerVulnerability[];
  bestPlayer: BestPlayerHighlight | null;
};

export type ScrimStatPoint = {
  scrimId: number;
  scrimDate: string;
  scrimName: string;
  stats: Record<string, number>;
};

export type TargetProgress = {
  target: PlayerTarget & {
    creator: { name: string | null; email: string };
  };
  currentValue: number;
  progressPercent: number;
  trending: "toward" | "away" | "neutral";
};

export const MapIdSchema = S.Number.pipe(
  S.int(),
  S.positive({ message: () => "Map ID must be a positive integer" })
);

export const TeamIdSchema = S.Number.pipe(
  S.int(),
  S.positive({ message: () => "Team ID must be a positive integer" })
);

export const PlayerNameSchema = S.String.pipe(
  S.minLength(1, { message: () => "Player name must not be empty" })
);

export const SlugSchema = S.String.pipe(
  S.minLength(1, { message: () => "Slug must not be empty" })
);
