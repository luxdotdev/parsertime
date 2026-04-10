import "server-only";

export {
  ComparisonAggregationService,
  ComparisonAggregationServiceLive,
} from "./aggregation-service";
export type { ComparisonAggregationServiceInterface } from "./aggregation-service";

export {
  ComparisonTrendsService,
  ComparisonTrendsServiceLive,
} from "./trends-service";
export type { ComparisonTrendsServiceInterface } from "./trends-service";

export {
  aggregatePlayerStats,
  calculateTrends,
  calculatePer10,
  calculatePercentage,
} from "./computation";

export { ComparisonQueryError, ComparisonValidationError } from "./errors";

export type {
  AggregatedStats,
  AvailableMap,
  ComparisonStats,
  GetAvailableMapsParams,
  MapBreakdown,
  TeamPlayer,
  TrendsAnalysis,
} from "./types";
