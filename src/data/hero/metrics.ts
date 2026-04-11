import { Metric, MetricBoundaries } from "effect";

export const heroStatsQuerySuccessTotal = Metric.counter(
  "hero.stats.query.success",
  {
    description: "Total successful hero stats queries",
    incremental: true,
  }
);

export const heroStatsQueryErrorTotal = Metric.counter(
  "hero.stats.query.error",
  {
    description: "Total hero stats query failures",
    incremental: true,
  }
);

export const heroStatsQueryDuration = Metric.histogram(
  "hero.stats.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of hero stats query duration in milliseconds"
);

export const heroKillsQuerySuccessTotal = Metric.counter(
  "hero.kills.query.success",
  {
    description: "Total successful hero kills queries",
    incremental: true,
  }
);

export const heroKillsQueryErrorTotal = Metric.counter(
  "hero.kills.query.error",
  {
    description: "Total hero kills query failures",
    incremental: true,
  }
);

export const heroKillsQueryDuration = Metric.histogram(
  "hero.kills.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of hero kills query duration in milliseconds"
);

export const heroDeathsQuerySuccessTotal = Metric.counter(
  "hero.deaths.query.success",
  {
    description: "Total successful hero deaths queries",
    incremental: true,
  }
);

export const heroDeathsQueryErrorTotal = Metric.counter(
  "hero.deaths.query.error",
  {
    description: "Total hero deaths query failures",
    incremental: true,
  }
);

export const heroDeathsQueryDuration = Metric.histogram(
  "hero.deaths.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of hero deaths query duration in milliseconds"
);

export const heroCacheRequestTotal = Metric.counter("hero.cache.request", {
  description: "Total hero cache requests",
  incremental: true,
});

export const heroCacheMissTotal = Metric.counter("hero.cache.miss", {
  description: "Total hero cache misses",
  incremental: true,
});
