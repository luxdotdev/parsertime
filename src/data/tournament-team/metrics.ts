import { Metric, MetricBoundaries } from "effect";

export const ttBaseDataQuerySuccessTotal = Metric.counter(
  "tournament_team.base_data.query.success",
  {
    description: "Successful tournament team base data queries",
    incremental: true,
  }
);

export const ttBaseDataQueryErrorTotal = Metric.counter(
  "tournament_team.base_data.query.error",
  {
    description: "Failed tournament team base data queries",
    incremental: true,
  }
);

export const ttBaseDataQueryDuration = Metric.histogram(
  "tournament_team.base_data.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of tournament team base data query duration"
);

export const ttRosterQuerySuccessTotal = Metric.counter(
  "tournament_team.roster.query.success",
  {
    description: "Successful tournament team roster queries",
    incremental: true,
  }
);

export const ttRosterQueryErrorTotal = Metric.counter(
  "tournament_team.roster.query.error",
  {
    description: "Failed tournament team roster queries",
    incremental: true,
  }
);

export const ttRosterQueryDuration = Metric.histogram(
  "tournament_team.roster.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of tournament team roster query duration"
);

export const ttExtendedDataQuerySuccessTotal = Metric.counter(
  "tournament_team.extended_data.query.success",
  {
    description: "Successful tournament team extended data queries",
    incremental: true,
  }
);

export const ttExtendedDataQueryErrorTotal = Metric.counter(
  "tournament_team.extended_data.query.error",
  {
    description: "Failed tournament team extended data queries",
    incremental: true,
  }
);

export const ttExtendedDataQueryDuration = Metric.histogram(
  "tournament_team.extended_data.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of tournament team extended data query duration"
);

export const ttStatsQuerySuccessTotal = Metric.counter(
  "tournament_team.stats.query.success",
  {
    description: "Successful tournament team stats queries",
    incremental: true,
  }
);

export const ttStatsQueryErrorTotal = Metric.counter(
  "tournament_team.stats.query.error",
  {
    description: "Failed tournament team stats queries",
    incremental: true,
  }
);

export const ttStatsQueryDuration = Metric.histogram(
  "tournament_team.stats.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of tournament team stats query duration"
);

export const ttCacheRequestTotal = Metric.counter(
  "tournament_team.cache.request",
  {
    description: "Total tournament team cache requests",
    incremental: true,
  }
);

export const ttCacheMissTotal = Metric.counter("tournament_team.cache.miss", {
  description: "Total tournament team cache misses",
  incremental: true,
});
