import "server-only";

export {
  TeamSharedDataService,
  TeamSharedDataServiceLive,
} from "./shared-data-service";
export type {
  TeamSharedDataServiceInterface,
  BaseTeamDataOptions,
} from "./shared-data-service";

export {
  findTeamNameForMapInMemory,
  buildFinalRoundMap,
  buildMatchStartMap,
  buildCapturesMaps,
  buildProgressMaps,
} from "./shared-core";
export type {
  BaseTeamData,
  ExtendedTeamData,
  TeamDateRange,
} from "./shared-core";

export { TeamNotFoundError, TeamQueryError } from "./errors";

export { TeamIdSchema, BaseTeamDataOptionsSchema } from "./types";
export type {
  // hero-swap types
  SwapTimingBucket,
  SwapWinrateBucket,
  SwapPair,
  PlayerSwapStats,
  SwapTimingOutcome,
  TeamHeroSwapStats,
  SwapRecord,
  // stats types
  TeamWinrates,
  TopMapByPlaytime,
  BestMapByWinrate,
  // trends types
  WinrateDataPoint,
  RecentFormMatch,
  RecentForm,
  StreakInfo,
  // fight-stats types
  TeamFightStats,
  // role-stats types
  RoleStats,
  RolePerformanceStats,
  RoleBalanceAnalysis,
  RoleTrio,
  RoleWinrateByMap,
  // hero-pool types
  HeroPlaytime,
  HeroWinrate,
  HeroSpecialist,
  HeroDiversity,
  HeroPoolAnalysis,
  HeroPoolRawData,
  // map-mode types
  MapModeStats,
  MapModePerformance,
  // quick-wins types
  QuickWinsStats,
  // ult types
  ScenarioStats,
  HeroUltImpact,
  UltImpactAnalysis,
  TeamUltRoleBreakdown,
  PlayerUltRanking,
  FightOpeningHero,
  TeamUltStats,
  // ban-impact types
  HeroBanImpact,
  TeamBanImpactAnalysis,
  OurBanImpact,
  TeamOurBanAnalysis,
  CombinedBanAnalysis,
  // ability-impact types
  AbilityScenarioStats,
  AbilityImpactData,
  HeroAbilityImpact,
  AbilityImpactAnalysis,
  // matchup types
  MapHeroEntry,
  MatchupMapResult,
  MatchupWinrateData,
  EnemyHeroWinrate,
  EnemyHeroAnalysis,
  // analytics types
  HeroPickrate,
  PlayerHeroData,
  HeroPickrateMatrix,
  HeroPickrateRawData,
  PlayerMapPerformance,
  PlayerMapPerformanceMatrix,
  // prediction types
  SimulatorContext,
} from "./types";

export { TeamStatsService, TeamStatsServiceLive } from "./stats-service";
export type { TeamStatsServiceInterface } from "./stats-service";

export { TeamTrendsService, TeamTrendsServiceLive } from "./trends-service";
export type { TeamTrendsServiceInterface } from "./trends-service";

export {
  TeamFightStatsService,
  TeamFightStatsServiceLive,
} from "./fight-stats-service";
export type { TeamFightStatsServiceInterface } from "./fight-stats-service";

export {
  TeamRoleStatsService,
  TeamRoleStatsServiceLive,
} from "./role-stats-service";
export type { TeamRoleStatsServiceInterface } from "./role-stats-service";

export {
  TeamHeroPoolService,
  TeamHeroPoolServiceLive,
} from "./hero-pool-service";
export type { TeamHeroPoolServiceInterface } from "./hero-pool-service";

export {
  TeamHeroSwapService,
  TeamHeroSwapServiceLive,
} from "./hero-swap-service";
export type { TeamHeroSwapServiceInterface } from "./hero-swap-service";

export { TeamMapModeService, TeamMapModeServiceLive } from "./map-mode-service";
export type { TeamMapModeServiceInterface } from "./map-mode-service";

export {
  TeamQuickWinsService,
  TeamQuickWinsServiceLive,
} from "./quick-wins-service";
export type { TeamQuickWinsServiceInterface } from "./quick-wins-service";

export { TeamUltService, TeamUltServiceLive } from "./ult-service";
export type { TeamUltServiceInterface } from "./ult-service";

export {
  TeamBanImpactService,
  TeamBanImpactServiceLive,
} from "./ban-impact-service";
export type { TeamBanImpactServiceInterface } from "./ban-impact-service";

export {
  TeamAbilityImpactService,
  TeamAbilityImpactServiceLive,
} from "./ability-impact-service";
export type { TeamAbilityImpactServiceInterface } from "./ability-impact-service";

export {
  TeamComparisonService,
  TeamComparisonServiceLive,
} from "./comparison-service";
export type { TeamComparisonServiceInterface } from "./comparison-service";

export { TeamMatchupService, TeamMatchupServiceLive } from "./matchup-service";
export type { TeamMatchupServiceInterface } from "./matchup-service";

export {
  TeamAnalyticsService,
  TeamAnalyticsServiceLive,
} from "./analytics-service";
export type { TeamAnalyticsServiceInterface } from "./analytics-service";

export {
  TeamPredictionService,
  TeamPredictionServiceLive,
} from "./prediction-service";
export type { TeamPredictionServiceInterface } from "./prediction-service";
