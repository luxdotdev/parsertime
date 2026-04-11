import { Layer } from "effect";

import { DataLabelingServiceLive } from "./admin/data-labeling-service";
import { ComparisonAggregationServiceLive } from "./comparison/aggregation-service";
import { ComparisonTrendsServiceLive } from "./comparison/trends-service";
import { HeroServiceLive } from "./hero/service";
import { HeroBanIntelligenceServiceLive } from "./intelligence/hero-ban-service";
import { MapIntelligenceServiceLive } from "./intelligence/map-service";
import { HeatmapServiceLive } from "./map/heatmap/service";
import { MapGroupServiceLive } from "./map/group-service";
import { KillfeedCalibrationServiceLive } from "./map/killfeed/calibration";
import { KillfeedServiceLive } from "./map/killfeed/service";
import { ReplayServiceLive } from "./map/replay/service";
import { RotationDeathServiceLive } from "./map/rotation-death-service";
import { TempoServiceLive } from "./map/tempo-service";
import { IntelligenceServiceLive } from "./player/intelligence-service";
import { PlayerServiceLive } from "./player/player-service";
import { ScoutingAnalyticsServiceLive } from "./player/scouting-analytics-service";
import { ScoutingServiceLive as PlayerScoutingServiceLive } from "./player/scouting-service";
import { TargetsServiceLive } from "./player/targets-service";
import { OpponentStrengthServiceLive } from "./scouting/opponent-strength-service";
import { ScoutingServiceLive } from "./scouting/scouting-service";
import { ScrimAbilityTimingServiceLive } from "./scrim/ability-timing-service";
import { ScrimOpponentServiceLive } from "./scrim/opponent-service";
import { ScrimOverviewServiceLive } from "./scrim/overview-service";
import { ScrimServiceLive } from "./scrim/scrim-service";
import { TeamAbilityImpactServiceLive } from "./team/ability-impact-service";
import { TeamBanImpactServiceLive } from "./team/ban-impact-service";
import { TeamComparisonServiceLive } from "./team/comparison-service";
import { TeamFightStatsServiceLive } from "./team/fight-stats-service";
import { TeamHeroPoolServiceLive } from "./team/hero-pool-service";
import { TeamHeroSwapServiceLive } from "./team/hero-swap-service";
import { TeamMapModeServiceLive } from "./team/map-mode-service";
import { TeamAnalyticsServiceLive } from "./team/analytics-service";
import { TeamMatchupServiceLive } from "./team/matchup-service";
import { TeamPredictionServiceLive } from "./team/prediction-service";
import { TeamQuickWinsServiceLive } from "./team/quick-wins-service";
import { TeamRoleStatsServiceLive } from "./team/role-stats-service";
import { TeamSharedDataServiceLive } from "./team/shared-data-service";
import { TeamStatsServiceLive } from "./team/stats-service";
import { TeamTrendsServiceLive } from "./team/trends-service";
import { TeamUltServiceLive } from "./team/ult-service";
import { BroadcastServiceLive } from "./tournament/broadcast-service";
import { TournamentServiceLive } from "./tournament/tournament-service";
import { TournamentTeamSharedDataServiceLive } from "./tournament-team/shared-data-service";
import { TournamentTeamStatsServiceLive } from "./tournament-team/stats-service";
import { UserServiceLive } from "./user/service";

export const DataLayerLive = Layer.mergeAll(
  UserServiceLive,
  DataLabelingServiceLive,
  HeroServiceLive,
  TournamentServiceLive,
  BroadcastServiceLive,

  ComparisonAggregationServiceLive,
  ComparisonTrendsServiceLive,

  ScoutingServiceLive,
  OpponentStrengthServiceLive,

  ScrimServiceLive,
  ScrimOverviewServiceLive,
  ScrimOpponentServiceLive,
  ScrimAbilityTimingServiceLive,

  PlayerServiceLive,
  IntelligenceServiceLive,
  PlayerScoutingServiceLive,
  ScoutingAnalyticsServiceLive,
  TargetsServiceLive,

  HeatmapServiceLive,
  KillfeedServiceLive,
  KillfeedCalibrationServiceLive,
  ReplayServiceLive,
  TempoServiceLive,
  RotationDeathServiceLive,
  MapGroupServiceLive,

  HeroBanIntelligenceServiceLive,
  MapIntelligenceServiceLive,

  TeamSharedDataServiceLive,
  TeamStatsServiceLive,
  TeamTrendsServiceLive,
  TeamFightStatsServiceLive,
  TeamRoleStatsServiceLive,
  TeamHeroPoolServiceLive,
  TeamHeroSwapServiceLive,
  TeamMapModeServiceLive,
  TeamQuickWinsServiceLive,
  TeamUltServiceLive,
  TeamBanImpactServiceLive,
  TeamAbilityImpactServiceLive,
  TeamComparisonServiceLive,
  TeamMatchupServiceLive,
  TeamAnalyticsServiceLive,
  TeamPredictionServiceLive,
  TournamentTeamSharedDataServiceLive,
  TournamentTeamStatsServiceLive
);
