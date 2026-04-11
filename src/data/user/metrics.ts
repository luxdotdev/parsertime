import { Metric, MetricBoundaries } from "effect";

export const getUserSuccessTotal = Metric.counter("user.getUser.success", {
  description: "Total successful getUser queries",
  incremental: true,
});

export const getUserErrorTotal = Metric.counter("user.getUser.error", {
  description: "Total getUser query failures",
  incremental: true,
});

export const getUserDuration = Metric.histogram(
  "user.getUser.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of getUser query duration in milliseconds"
);

export const getTeamsSuccessTotal = Metric.counter(
  "user.getTeamsWithPerms.success",
  {
    description: "Total successful getTeamsWithPerms queries",
    incremental: true,
  }
);

export const getTeamsErrorTotal = Metric.counter(
  "user.getTeamsWithPerms.error",
  {
    description: "Total getTeamsWithPerms query failures",
    incremental: true,
  }
);

export const getTeamsDuration = Metric.histogram(
  "user.getTeamsWithPerms.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of getTeamsWithPerms query duration in milliseconds"
);

export const getAppSettingsSuccessTotal = Metric.counter(
  "user.getAppSettings.success",
  {
    description: "Total successful getAppSettings queries",
    incremental: true,
  }
);

export const getAppSettingsErrorTotal = Metric.counter(
  "user.getAppSettings.error",
  {
    description: "Total getAppSettings query failures",
    incremental: true,
  }
);

export const getAppSettingsDuration = Metric.histogram(
  "user.getAppSettings.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of getAppSettings query duration in milliseconds"
);

export const userCacheRequestTotal = Metric.counter("user.cache.request", {
  description: "Total user cache requests",
  incremental: true,
});

export const userCacheMissTotal = Metric.counter("user.cache.miss", {
  description: "Total user cache misses",
  incremental: true,
});
