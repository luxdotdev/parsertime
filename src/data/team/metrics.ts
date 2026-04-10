import { Metric, MetricBoundaries } from "effect";

export const teamRosterQuerySuccessTotal = Metric.counter(
  "team.roster.query.success",
  {
    description: "Total successful team roster queries",
    incremental: true,
  }
);

export const teamRosterQueryErrorTotal = Metric.counter(
  "team.roster.query.error",
  {
    description: "Total team roster query failures",
    incremental: true,
  }
);

export const teamRosterQueryDuration = Metric.histogram(
  "team.roster.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of team roster query duration in milliseconds"
);

export const teamBaseDataQuerySuccessTotal = Metric.counter(
  "team.base_data.query.success",
  {
    description: "Total successful base team data queries",
    incremental: true,
  }
);

export const teamBaseDataQueryErrorTotal = Metric.counter(
  "team.base_data.query.error",
  {
    description: "Total base team data query failures",
    incremental: true,
  }
);

export const teamBaseDataQueryDuration = Metric.histogram(
  "team.base_data.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of base team data query duration in milliseconds"
);

export const teamExtendedDataQuerySuccessTotal = Metric.counter(
  "team.extended_data.query.success",
  {
    description: "Total successful extended team data queries",
    incremental: true,
  }
);

export const teamExtendedDataQueryErrorTotal = Metric.counter(
  "team.extended_data.query.error",
  {
    description: "Total extended team data query failures",
    incremental: true,
  }
);

export const teamExtendedDataQueryDuration = Metric.histogram(
  "team.extended_data.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of extended team data query duration in milliseconds"
);

export const teamCacheRequestTotal = Metric.counter("team.cache.request", {
  description: "Total team data cache requests",
  incremental: true,
});

export const teamCacheMissTotal = Metric.counter("team.cache.miss", {
  description: "Total team data cache misses (triggered lookup)",
  incremental: true,
});
