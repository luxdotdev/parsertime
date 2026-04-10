import "server-only";

export { PlayerService, PlayerServiceLive } from "./player-service";
export type { PlayerServiceInterface } from "./player-service";

export {
  IntelligenceService,
  IntelligenceServiceLive,
} from "./intelligence-service";
export type { IntelligenceServiceInterface } from "./intelligence-service";

export { ScoutingService, ScoutingServiceLive } from "./scouting-service";
export type { ScoutingServiceInterface } from "./scouting-service";

export {
  ScoutingAnalyticsService,
  ScoutingAnalyticsServiceLive,
} from "./scouting-analytics-service";
export type { ScoutingAnalyticsServiceInterface } from "./scouting-analytics-service";

export {
  TargetsService,
  TargetsServiceLive,
  calculateTargetProgress,
} from "./targets-service";
export type { TargetsServiceInterface } from "./targets-service";

export {
  PlayerQueryError,
  PlayerNotFoundError,
  ScoutingQueryError,
  ScoutingAnalyticsQueryError,
  IntelligenceQueryError,
  TargetsQueryError,
} from "./errors";

export type {
  MostPlayedHeroRow,
  ScoutingPlayerSummary,
  HeroFrequency,
  TournamentMatchEntry,
  TournamentRecord,
  PlayerProfile,
  HeroStatZScore,
  ScoutingHeroPerformance,
  AdvancedMetrics,
  KillPatterns,
  RoleDistributionEntry,
  AccuracyStats,
  MapWinrateEntry,
  MapTypeWinrateEntry,
  CompetitiveMapWinrates,
  ScrimMapWinrates,
  ScrimData,
  InsightItem,
  PlayerScoutingAnalytics,
  PlayerHeroZScore,
  PlayerHeroDepth,
  HeroSubstitutionRate,
  PlayerVulnerability,
  BestPlayerHighlight,
  PlayerIntelligence,
  ScrimStatPoint,
  TargetProgress,
} from "./types";

export {
  MapIdSchema,
  TeamIdSchema,
  PlayerNameSchema,
  SlugSchema,
} from "./types";
