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

export { TeamStatsService, TeamStatsServiceLive } from "./stats-service";
export type {
  TeamStatsServiceInterface,
  TeamWinrates,
  TopMapByPlaytime,
  BestMapByWinrate,
} from "./stats-service";

export { TeamTrendsService, TeamTrendsServiceLive } from "./trends-service";
export type {
  TeamTrendsServiceInterface,
  WinrateDataPoint,
  RecentFormMatch,
  RecentForm,
  StreakInfo,
} from "./trends-service";

export {
  TeamFightStatsService,
  TeamFightStatsServiceLive,
} from "./fight-stats-service";
export type {
  TeamFightStatsServiceInterface,
  TeamFightStats,
} from "./fight-stats-service";

export {
  TeamRoleStatsService,
  TeamRoleStatsServiceLive,
} from "./role-stats-service";
export type {
  TeamRoleStatsServiceInterface,
  RoleStats,
  RolePerformanceStats,
  RoleBalanceAnalysis,
  RoleTrio,
  RoleWinrateByMap,
} from "./role-stats-service";

export {
  TeamHeroPoolService,
  TeamHeroPoolServiceLive,
} from "./hero-pool-service";
export type {
  TeamHeroPoolServiceInterface,
  HeroPlaytime,
  HeroWinrate,
  HeroSpecialist,
  HeroDiversity,
  HeroPoolAnalysis,
  HeroPoolRawData,
} from "./hero-pool-service";

export {
  TeamHeroSwapService,
  TeamHeroSwapServiceLive,
} from "./hero-swap-service";
export type {
  TeamHeroSwapServiceInterface,
  TeamHeroSwapStats,
  SwapTimingBucket,
  SwapWinrateBucket,
  SwapPair,
  PlayerSwapStats,
  SwapTimingOutcome,
} from "./hero-swap-service";

export { TeamMapModeService, TeamMapModeServiceLive } from "./map-mode-service";
export type {
  TeamMapModeServiceInterface,
  MapModeStats,
  MapModePerformance,
} from "./map-mode-service";

export {
  TeamQuickWinsService,
  TeamQuickWinsServiceLive,
} from "./quick-wins-service";
export type {
  TeamQuickWinsServiceInterface,
  QuickWinsStats,
} from "./quick-wins-service";

export { TeamUltService, TeamUltServiceLive } from "./ult-service";
export type {
  TeamUltServiceInterface,
  ScenarioStats,
  HeroUltImpact,
  UltImpactAnalysis,
  TeamUltRoleBreakdown,
  PlayerUltRanking,
  FightOpeningHero,
  TeamUltStats,
} from "./ult-service";

export {
  TeamBanImpactService,
  TeamBanImpactServiceLive,
} from "./ban-impact-service";
export type {
  TeamBanImpactServiceInterface,
  HeroBanImpact,
  TeamBanImpactAnalysis,
  OurBanImpact,
  TeamOurBanAnalysis,
  CombinedBanAnalysis,
} from "./ban-impact-service";

export {
  TeamAbilityImpactService,
  TeamAbilityImpactServiceLive,
} from "./ability-impact-service";
export type {
  TeamAbilityImpactServiceInterface,
  AbilityScenarioStats,
  AbilityImpactData,
  HeroAbilityImpact,
  AbilityImpactAnalysis,
} from "./ability-impact-service";

export {
  TeamComparisonService,
  TeamComparisonServiceLive,
} from "./comparison-service";
export type { TeamComparisonServiceInterface } from "./comparison-service";

export { TeamMatchupService, TeamMatchupServiceLive } from "./matchup-service";
export type {
  TeamMatchupServiceInterface,
  MapHeroEntry,
  MatchupMapResult,
  MatchupWinrateData,
  EnemyHeroWinrate,
  EnemyHeroAnalysis,
} from "./matchup-service";
