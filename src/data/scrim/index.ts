import "server-only";

export { ScrimService, ScrimServiceLive } from "./scrim-service";
export type { ScrimServiceInterface, Winrate } from "./scrim-service";

export {
  ScrimOverviewService,
  ScrimOverviewServiceLive,
} from "./overview-service";
export type { ScrimOverviewServiceInterface } from "./overview-service";

export {
  ScrimOpponentService,
  ScrimOpponentServiceLive,
} from "./opponent-service";
export type { ScrimOpponentServiceInterface } from "./opponent-service";

export {
  ScrimAbilityTimingService,
  ScrimAbilityTimingServiceLive,
} from "./ability-timing-service";
export type { ScrimAbilityTimingServiceInterface } from "./ability-timing-service";

export { ScrimNotFoundError, ScrimQueryError } from "./errors";

export {
  ScrimIdSchema,
  MapIdSchema,
  TeamIdSchema,
  UserIdSchema,
  PlayerNameSchema,
  OpponentAbbrSchema,
} from "./types";

export type {
  AbilityTimingAnalysis,
  AbilityTimingOutlier,
  AbilityTimingRow,
  FightPhase,
  FightTimeline,
  MapAbilityTimingAnalysis,
  MapResult,
  PlayerMapPerformance,
  PlayerScrimPerformance,
  ScrimFightAnalysis,
  ScrimInsight,
  ScrimOutlier,
  ScrimOverviewData,
  ScrimSwapAnalysis,
  ScrimTeamTotals,
  ScrimUltAnalysis,
  UltEfficiency,
} from "./types";

export {
  assignPlayersToSubroles,
  buildPlayerUltComparisons,
} from "./ult-helpers";
export type {
  PlayerUltComparison,
  PlayerUltSummary,
  SubroleUltTiming,
} from "./ult-helpers";
