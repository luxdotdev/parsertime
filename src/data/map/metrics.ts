import { Metric, MetricBoundaries } from "effect";

export const heatmapQuerySuccessTotal = Metric.counter(
  "map.heatmap.query.success",
  {
    description: "Total successful heatmap data queries",
    incremental: true,
  }
);

export const heatmapQueryErrorTotal = Metric.counter(
  "map.heatmap.query.error",
  {
    description: "Total heatmap data query failures",
    incremental: true,
  }
);

export const heatmapQueryDuration = Metric.histogram(
  "map.heatmap.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of heatmap data query duration in milliseconds"
);

export const killfeedUltSpansQuerySuccessTotal = Metric.counter(
  "map.killfeed.ult_spans.query.success",
  {
    description: "Total successful killfeed ultimate spans queries",
    incremental: true,
  }
);

export const killfeedUltSpansQueryErrorTotal = Metric.counter(
  "map.killfeed.ult_spans.query.error",
  {
    description: "Total killfeed ultimate spans query failures",
    incremental: true,
  }
);

export const killfeedUltSpansQueryDuration = Metric.histogram(
  "map.killfeed.ult_spans.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of killfeed ultimate spans query duration in milliseconds"
);

export const killfeedCalibrationQuerySuccessTotal = Metric.counter(
  "map.killfeed.calibration.query.success",
  {
    description: "Total successful killfeed calibration queries",
    incremental: true,
  }
);

export const killfeedCalibrationQueryErrorTotal = Metric.counter(
  "map.killfeed.calibration.query.error",
  {
    description: "Total killfeed calibration query failures",
    incremental: true,
  }
);

export const killfeedCalibrationQueryDuration = Metric.histogram(
  "map.killfeed.calibration.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of killfeed calibration query duration in milliseconds"
);

export const replayDataQuerySuccessTotal = Metric.counter(
  "map.replay.data.query.success",
  {
    description: "Total successful replay data queries",
    incremental: true,
  }
);

export const replayDataQueryErrorTotal = Metric.counter(
  "map.replay.data.query.error",
  {
    description: "Total replay data query failures",
    incremental: true,
  }
);

export const replayDataQueryDuration = Metric.histogram(
  "map.replay.data.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of replay data query duration in milliseconds"
);

export const tempoQuerySuccessTotal = Metric.counter(
  "map.tempo.query.success",
  {
    description: "Total successful tempo chart data queries",
    incremental: true,
  }
);

export const tempoQueryErrorTotal = Metric.counter("map.tempo.query.error", {
  description: "Total tempo chart data query failures",
  incremental: true,
});

export const tempoQueryDuration = Metric.histogram(
  "map.tempo.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of tempo chart data query duration in milliseconds"
);

export const rotationDeathQuerySuccessTotal = Metric.counter(
  "map.rotation_death.query.success",
  {
    description: "Total successful rotation death analysis queries",
    incremental: true,
  }
);

export const rotationDeathQueryErrorTotal = Metric.counter(
  "map.rotation_death.query.error",
  {
    description: "Total rotation death analysis query failures",
    incremental: true,
  }
);

export const rotationDeathQueryDuration = Metric.histogram(
  "map.rotation_death.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of rotation death analysis query duration in milliseconds"
);

export const mapGroupQuerySuccessTotal = Metric.counter(
  "map.group.query.success",
  {
    description: "Total successful map group queries",
    incremental: true,
  }
);

export const mapGroupQueryErrorTotal = Metric.counter("map.group.query.error", {
  description: "Total map group query failures",
  incremental: true,
});

export const mapGroupQueryDuration = Metric.histogram(
  "map.group.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of map group query duration in milliseconds"
);

export const mapGroupMutationSuccessTotal = Metric.counter(
  "map.group.mutation.success",
  {
    description: "Total successful map group mutations",
    incremental: true,
  }
);

export const mapGroupMutationErrorTotal = Metric.counter(
  "map.group.mutation.error",
  {
    description: "Total map group mutation failures",
    incremental: true,
  }
);

export const mapGroupMutationDuration = Metric.histogram(
  "map.group.mutation.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of map group mutation duration in milliseconds"
);

export const mapHeroTrendsQuerySuccessTotal = Metric.counter(
  "map.hero_trends.query.success",
  {
    description: "Total successful map hero trends queries",
    incremental: true,
  }
);

export const mapHeroTrendsQueryErrorTotal = Metric.counter(
  "map.hero_trends.query.error",
  {
    description: "Total map hero trends query failures",
    incremental: true,
  }
);

export const mapHeroTrendsQueryDuration = Metric.histogram(
  "map.hero_trends.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of map hero trends query duration in milliseconds"
);

export const mapCacheRequestTotal = Metric.counter("map.cache.request", {
  description: "Total map data cache requests",
  incremental: true,
});

export const mapCacheMissTotal = Metric.counter("map.cache.miss", {
  description: "Total map data cache misses (triggered lookup)",
  incremental: true,
});
