import { Metric, MetricBoundaries } from "effect";

// Hero Ban Intelligence

export const heroBanIntelligenceQuerySuccessTotal = Metric.counter(
  "intelligence.hero_ban.query.success",
  {
    description: "Total successful hero ban intelligence queries",
    incremental: true,
  }
);

export const heroBanIntelligenceQueryErrorTotal = Metric.counter(
  "intelligence.hero_ban.query.error",
  {
    description: "Total hero ban intelligence query failures",
    incremental: true,
  }
);

export const heroBanIntelligenceQueryDuration = Metric.histogram(
  "intelligence.hero_ban.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of hero ban intelligence query duration in milliseconds"
);

// Map Intelligence

export const mapIntelligenceQuerySuccessTotal = Metric.counter(
  "intelligence.map.query.success",
  {
    description: "Total successful map intelligence queries",
    incremental: true,
  }
);

export const mapIntelligenceQueryErrorTotal = Metric.counter(
  "intelligence.map.query.error",
  {
    description: "Total map intelligence query failures",
    incremental: true,
  }
);

export const mapIntelligenceQueryDuration = Metric.histogram(
  "intelligence.map.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of map intelligence query duration in milliseconds"
);

// cache metrics

export const intelligenceCacheRequestTotal = Metric.counter(
  "intelligence.cache.request",
  {
    description: "Total intelligence data cache requests",
    incremental: true,
  }
);

export const intelligenceCacheMissTotal = Metric.counter(
  "intelligence.cache.miss",
  {
    description: "Total intelligence data cache misses (triggered lookup)",
    incremental: true,
  }
);
