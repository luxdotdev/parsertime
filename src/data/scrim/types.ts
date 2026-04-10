import type { TrendsAnalysis } from "@/data/comparison/types";
import type {
  SwapTimingOutcome,
  SwapWinrateBucket,
} from "@/data/team/hero-swap-service";
import type { ValidStatColumn } from "@/lib/stat-percentiles";
import type { HeroName, RoleName } from "@/types/heroes";
import type { MapType } from "@prisma/client";
import { Schema as S } from "effect";
import type { PlayerUltComparison, SubroleUltTiming } from "./ult-helpers";

export type FightPhase = "pre-fight" | "early" | "mid" | "late" | "cleanup";

export type AbilityPhaseStats = {
  fights: number;
  wins: number;
  losses: number;
  winrate: number;
};

export type AbilityTimingRow = {
  heroName: string;
  abilityName: string;
  abilitySlot: 1 | 2;
  impactRating: "high" | "critical";
  phases: Record<FightPhase, AbilityPhaseStats>;
  overallWinrate: number;
  totalFights: number;
};

export type AbilityTimingOutlier = {
  heroName: string;
  abilityName: string;
  phase: FightPhase;
  phaseWinrate: number;
  overallWinrate: number;
  deviation: number;
  bestPhase: FightPhase;
  bestPhaseWinrate: number;
  type: "positive" | "negative";
};

export type AbilityTimingAnalysis = {
  rows: AbilityTimingRow[];
  outliers: AbilityTimingOutlier[];
};

export type FightAbilityEvent = {
  time: number;
  hero: string;
  ability: string;
  abilitySlot: 1 | 2;
  team: "ours" | "enemy";
  phase: FightPhase;
};

export type FightKillEvent = {
  time: number;
  attacker: string;
  attackerHero: string;
  victim: string;
  victimHero: string;
  attackerSide: "ours" | "enemy";
};

export type FightTimeline = {
  fightNumber: number;
  startTime: number;
  endTime: number;
  duration: number;
  outcome: "win" | "loss";
  kills: FightKillEvent[];
  abilityUses: FightAbilityEvent[];
};

export type ScrimFightTimelines = {
  fights: FightTimeline[];
  ourTeamName: string;
};

export type MapAbilityTimingAnalysis = {
  team1: AbilityTimingAnalysis;
  team2: AbilityTimingAnalysis;
};

export type ScrimMapResult = {
  mapName: string;
  mapType: MapType;
  scrimDate: Date;
  opponentWon: boolean;
  source: "scrim";
};

export type ScrimHeroBan = {
  mapName: string;
  mapType: MapType;
  scrimDate: Date;
  opponentWon: boolean;
  opponentBans: string[];
  source: "scrim";
};

export type ScrimPlayerStat = {
  playerName: string;
  hero: string;
  role: "Tank" | "Damage" | "Support";
  timePlayed: number;
  eliminations: number;
  deaths: number;
  source: "scrim";
};

export type ScrimOutlier = {
  stat: ValidStatColumn;
  zScore: number;
  percentile: number;
  direction: "high" | "low";
  label: string;
};

export type PlayerMapPerformance = {
  mapName: string;
  mapIndex: number;
  kdRatio: number;
  eliminationsPer10: number;
  heroDamagePer10: number;
  healingDealtPer10: number;
  firstDeathRate: number;
  teamFirstDeathRate: number;
};

export type PlayerScrimPerformance = {
  playerKey: string;
  playerName: string;
  primaryHero: HeroName;
  heroes: HeroName[];
  mapsPlayed: number;
  eliminations: number;
  deaths: number;
  heroDamageDealt: number;
  healingDealt: number;
  heroTimePlayed: number;
  kdRatio: number;
  eliminationsPer10: number;
  deathsPer10: number;
  heroDamagePer10: number;
  healingDealtPer10: number;
  firstDeathCount: number;
  firstDeathRate: number;
  teamFirstDeathCount: number;
  teamFirstDeathRate: number;
  perMapPerformance: PlayerMapPerformance[];
  zScores: Partial<Record<ValidStatColumn, number>>;
  outliers: ScrimOutlier[];
  trend: "improving" | "stable" | "declining";
  trendData?: TrendsAnalysis;
};

export type ScrimInsight = {
  type:
    | "mvp"
    | "most_improved"
    | "most_declined"
    | "outlier_positive"
    | "outlier_negative";
  headline: string;
  playerName?: string;
};

export type MapResult = {
  mapId: number;
  mapName: string;
  winner: "our_team" | "opponent" | "draw";
};

export type ScrimTeamTotals = {
  eliminations: number;
  deaths: number;
  heroDamage: number;
  healing: number;
  kdRatio: number;
};

export type ScrimFightAnalysis = {
  totalFights: number;
  fightsWon: number;
  fightWinrate: number;
  teamFirstDeathCount: number;
  teamFirstDeathRate: number;
  firstDeathWinrate: number;
  firstPickCount: number;
  firstPickRate: number;
  firstPickWinrate: number;
  firstUltCount: number;
  firstUltRate: number;
  firstUltWinrate: number;
  opponentFirstUltCount: number;
  opponentFirstUltWinrate: number;
};

export type { PlayerUltComparison, SubroleUltTiming };

export type ScrimUltRoleBreakdown = {
  role: RoleName;
  ourCount: number;
  opponentCount: number;
  ourFirstRate: number;
  ourSubroleTimings: SubroleUltTiming[];
  opponentSubroleTimings: SubroleUltTiming[];
};

export type FightInitiatingUlt = {
  hero: string;
  count: number;
  isOurTeam: boolean;
};

export type UltEfficiency = {
  ultimateEfficiency: number;
  avgUltsInWonFights: number;
  avgUltsInLostFights: number;
  wastedUltimates: number;
  totalUltsUsedInFights: number;
  fightsWon: number;
  fightsLost: number;
  dryFights: number;
  dryFightWins: number;
  dryFightWinrate: number;
  dryFightReversals: number;
  dryFightReversalRate: number;
  nonDryFights: number;
  nonDryFightReversals: number;
  nonDryFightReversalRate: number;
};

export type ScrimUltAnalysis = {
  ourUltsUsed: number;
  opponentUltsUsed: number;
  ultsByRole: ScrimUltRoleBreakdown[];
  topUltUser: { playerName: string; hero: string; count: number } | null;
  avgChargeTime: number;
  avgHoldTime: number;
  playerComparisons: PlayerUltComparison[];
  ourFightInitiations: number;
  opponentFightInitiations: number;
  fightsWithUlts: number;
  ourTopFightInitiator: FightInitiatingUlt | null;
  opponentTopFightInitiator: FightInitiatingUlt | null;
  ultEfficiency: UltEfficiency;
};

export type ScrimSwapAnalysis = {
  ourSwaps: number;
  opponentSwaps: number;
  ourSwapsPerMap: number;
  opponentSwapsPerMap: number;
  mapsWithOurSwaps: number;
  mapsWithoutOurSwaps: number;
  noSwapWinrate: number;
  noSwapWins: number;
  noSwapLosses: number;
  swapWinrate: number;
  swapWins: number;
  swapLosses: number;
  avgHeroTimeBeforeSwap: number;
  ourTopSwap: { from: string; to: string; count: number } | null;
  opponentTopSwap: { from: string; to: string; count: number } | null;
  topSwapper: {
    playerName: string;
    count: number;
    mapsCount: number;
  } | null;
  winrateBySwapCount: SwapWinrateBucket[];
  timingOutcomes: SwapTimingOutcome[];
};

export type ScrimOverviewData = {
  mapCount: number;
  wins: number;
  losses: number;
  draws: number;
  ourTeamName: string;
  opponentTeamName: string;
  mapResults: MapResult[];
  teamPlayers: PlayerScrimPerformance[];
  insights: ScrimInsight[];
  teamTotals: ScrimTeamTotals;
  fightAnalysis: ScrimFightAnalysis;
  ultAnalysis: ScrimUltAnalysis;
  swapAnalysis: ScrimSwapAnalysis;
  abilityTimingAnalysis: AbilityTimingAnalysis;
};

export type { SwapTimingOutcome, SwapWinrateBucket, TrendsAnalysis };

export const ScrimIdSchema = S.Number.pipe(
  S.int(),
  S.positive({ message: () => "Scrim ID must be a positive integer" })
);

export const MapIdSchema = S.Number.pipe(
  S.int(),
  S.positive({ message: () => "Map ID must be a positive integer" })
);

export const TeamIdSchema = S.Number.pipe(
  S.int(),
  S.positive({ message: () => "Team ID must be a positive integer" })
);

export const UserIdSchema = S.String.pipe(
  S.minLength(1, { message: () => "User ID must not be empty" })
);

export const PlayerNameSchema = S.String.pipe(
  S.minLength(1, { message: () => "Player name must not be empty" })
);

export const OpponentAbbrSchema = S.String.pipe(
  S.minLength(1, {
    message: () => "Opponent abbreviation must not be empty",
  })
);
