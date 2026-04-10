import { Metric, MetricBoundaries } from "effect";

export const comparisonStatsSuccessTotal = Metric.counter(
  "comparison.stats.query.success",
  {
    description: "Total successful comparison stats queries",
    incremental: true,
  }
);

export const comparisonStatsErrorTotal = Metric.counter(
  "comparison.stats.query.error",
  {
    description: "Total comparison stats query failures",
    incremental: true,
  }
);

export const comparisonStatsDuration = Metric.histogram(
  "comparison.stats.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of comparison stats query duration in milliseconds"
);

export const availableMapsSuccessTotal = Metric.counter(
  "comparison.available_maps.query.success",
  {
    description: "Total successful available maps queries",
    incremental: true,
  }
);

export const availableMapsErrorTotal = Metric.counter(
  "comparison.available_maps.query.error",
  {
    description: "Total available maps query failures",
    incremental: true,
  }
);

export const availableMapsDuration = Metric.histogram(
  "comparison.available_maps.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of available maps query duration in milliseconds"
);

export const teamPlayersSuccessTotal = Metric.counter(
  "comparison.team_players.query.success",
  {
    description: "Total successful team players queries",
    incremental: true,
  }
);

export const teamPlayersErrorTotal = Metric.counter(
  "comparison.team_players.query.error",
  {
    description: "Total team players query failures",
    incremental: true,
  }
);

export const teamPlayersDuration = Metric.histogram(
  "comparison.team_players.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of team players query duration in milliseconds"
);

export const trendsSuccessTotal = Metric.counter("comparison.trends.success", {
  description: "Total successful trends calculations",
  incremental: true,
});

export const trendsErrorTotal = Metric.counter("comparison.trends.error", {
  description: "Total trends calculation failures",
  incremental: true,
});

export const trendsDuration = Metric.histogram(
  "comparison.trends.duration_ms",
  MetricBoundaries.exponential({ start: 1, factor: 2, count: 10 }),
  "Distribution of trends calculation duration in milliseconds"
);

export const comparisonCacheRequestTotal = Metric.counter(
  "comparison.cache.request",
  {
    description: "Total comparison data cache requests",
    incremental: true,
  }
);

export const comparisonCacheMissTotal = Metric.counter(
  "comparison.cache.miss",
  {
    description: "Total comparison data cache misses (triggered lookup)",
    incremental: true,
  }
);
