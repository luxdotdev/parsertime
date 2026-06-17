import { Metric, MetricBoundaries } from "effect";

export const playerMostPlayedQuerySuccessTotal = Metric.counter(
  "player.most_played.query.success",
  {
    description: "Total successful most-played-heroes queries",
    incremental: true,
  }
);

export const playerMostPlayedQueryErrorTotal = Metric.counter(
  "player.most_played.query.error",
  {
    description: "Total most-played-heroes query failures",
    incremental: true,
  }
);

export const playerMostPlayedQueryDuration = Metric.histogram(
  "player.most_played.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of most-played-heroes query duration in milliseconds"
);

export const playerIntelligenceQuerySuccessTotal = Metric.counter(
  "player.intelligence.query.success",
  {
    description: "Total successful player intelligence queries",
    incremental: true,
  }
);

export const playerIntelligenceQueryErrorTotal = Metric.counter(
  "player.intelligence.query.error",
  {
    description: "Total player intelligence query failures",
    incremental: true,
  }
);

export const playerIntelligenceQueryDuration = Metric.histogram(
  "player.intelligence.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of player intelligence query duration in milliseconds"
);

export const scoutingPlayersQuerySuccessTotal = Metric.counter(
  "player.scouting_players.query.success",
  {
    description: "Total successful scouting players queries",
    incremental: true,
  }
);

export const scoutingPlayersQueryErrorTotal = Metric.counter(
  "player.scouting_players.query.error",
  {
    description: "Total scouting players query failures",
    incremental: true,
  }
);

export const scoutingPlayersQueryDuration = Metric.histogram(
  "player.scouting_players.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of scouting players query duration in milliseconds"
);

export const playerProfileQuerySuccessTotal = Metric.counter(
  "player.profile.query.success",
  {
    description: "Total successful player profile queries",
    incremental: true,
  }
);

export const playerProfileQueryErrorTotal = Metric.counter(
  "player.profile.query.error",
  {
    description: "Total player profile query failures",
    incremental: true,
  }
);

export const playerProfileQueryDuration = Metric.histogram(
  "player.profile.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of player profile query duration in milliseconds"
);

export const scoutingAnalyticsQuerySuccessTotal = Metric.counter(
  "player.scouting_analytics.query.success",
  {
    description: "Total successful scouting analytics queries",
    incremental: true,
  }
);

export const scoutingAnalyticsQueryErrorTotal = Metric.counter(
  "player.scouting_analytics.query.error",
  {
    description: "Total scouting analytics query failures",
    incremental: true,
  }
);

export const scoutingAnalyticsQueryDuration = Metric.histogram(
  "player.scouting_analytics.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of scouting analytics query duration in milliseconds"
);

export const playerTargetsQuerySuccessTotal = Metric.counter(
  "player.targets.query.success",
  {
    description: "Total successful player targets queries",
    incremental: true,
  }
);

export const playerTargetsQueryErrorTotal = Metric.counter(
  "player.targets.query.error",
  {
    description: "Total player targets query failures",
    incremental: true,
  }
);

export const playerTargetsQueryDuration = Metric.histogram(
  "player.targets.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of player targets query duration in milliseconds"
);

export const teamTargetsQuerySuccessTotal = Metric.counter(
  "player.team_targets.query.success",
  {
    description: "Total successful team targets queries",
    incremental: true,
  }
);

export const teamTargetsQueryErrorTotal = Metric.counter(
  "player.team_targets.query.error",
  {
    description: "Total team targets query failures",
    incremental: true,
  }
);

export const teamTargetsQueryDuration = Metric.histogram(
  "player.team_targets.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of team targets query duration in milliseconds"
);

export const recentScrimStatsQuerySuccessTotal = Metric.counter(
  "player.recent_scrim_stats.query.success",
  {
    description: "Total successful recent scrim stats queries",
    incremental: true,
  }
);

export const recentScrimStatsQueryErrorTotal = Metric.counter(
  "player.recent_scrim_stats.query.error",
  {
    description: "Total recent scrim stats query failures",
    incremental: true,
  }
);

export const recentScrimStatsQueryDuration = Metric.histogram(
  "player.recent_scrim_stats.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of recent scrim stats query duration in milliseconds"
);

export const playerCacheRequestTotal = Metric.counter("player.cache.request", {
  description: "Total player data cache requests",
  incremental: true,
});

export const playerCacheMissTotal = Metric.counter("player.cache.miss", {
  description: "Total player data cache misses (triggered lookup)",
  incremental: true,
});
