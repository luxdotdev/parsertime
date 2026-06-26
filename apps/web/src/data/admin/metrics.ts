import { Metric, MetricBoundaries } from "effect";

export const unlabeledMatchesQuerySuccessTotal = Metric.counter(
  "admin.unlabeled_matches.query.success",
  {
    description: "Total successful unlabeled matches queries",
    incremental: true,
  }
);

export const unlabeledMatchesQueryErrorTotal = Metric.counter(
  "admin.unlabeled_matches.query.error",
  {
    description: "Total unlabeled matches query failures",
    incremental: true,
  }
);

export const unlabeledMatchesQueryDuration = Metric.histogram(
  "admin.unlabeled_matches.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of unlabeled matches query duration in milliseconds"
);

export const matchForLabelingQuerySuccessTotal = Metric.counter(
  "admin.match_for_labeling.query.success",
  {
    description: "Total successful match-for-labeling queries",
    incremental: true,
  }
);

export const matchForLabelingQueryErrorTotal = Metric.counter(
  "admin.match_for_labeling.query.error",
  {
    description: "Total match-for-labeling query failures",
    incremental: true,
  }
);

export const matchForLabelingQueryDuration = Metric.histogram(
  "admin.match_for_labeling.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of match-for-labeling query duration in milliseconds"
);

export const adminCacheRequestTotal = Metric.counter("admin.cache.request", {
  description: "Total admin cache requests",
  incremental: true,
});

export const adminCacheMissTotal = Metric.counter("admin.cache.miss", {
  description: "Total admin cache misses",
  incremental: true,
});
