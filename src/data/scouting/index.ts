export { ScoutingService, ScoutingServiceLive } from "./scouting-service";
export type {
  ScoutingServiceInterface,
  OpponentMatchRow,
} from "./scouting-service";

export {
  OpponentStrengthService,
  OpponentStrengthServiceLive,
} from "./opponent-strength-service";
export type { OpponentStrengthServiceInterface } from "./opponent-strength-service";

export { ScoutingQueryError, ScoutingTeamNotFoundError } from "./errors";

export type {
  MatchResult,
  ScoutingTeam,
  ScoutingTeamOverview,
  HeroBanEntry,
  ScoutingHeroBans,
  MapPerformanceEntry,
  ScoutingMapAnalysis,
  ScoutingMatchHistoryEntry,
  ScoutingRecommendation,
  ScoutingRecommendations,
  ScoutingTeamProfile,
  TeamStrengthRating,
} from "./types";
