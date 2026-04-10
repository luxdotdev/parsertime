import { Metric, MetricBoundaries } from "effect";

export const scoutingTeamsQuerySuccessTotal = Metric.counter(
  "scouting.teams.query.success",
  {
    description: "Total successful scouting teams queries",
    incremental: true,
  }
);

export const scoutingTeamsQueryErrorTotal = Metric.counter(
  "scouting.teams.query.error",
  {
    description: "Total scouting teams query failures",
    incremental: true,
  }
);

export const scoutingTeamsQueryDuration = Metric.histogram(
  "scouting.teams.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of scouting teams query duration in milliseconds"
);

export const scoutingOpponentMatchDataQuerySuccessTotal = Metric.counter(
  "scouting.opponent_match_data.query.success",
  {
    description: "Total successful opponent match data queries",
    incremental: true,
  }
);

export const scoutingOpponentMatchDataQueryErrorTotal = Metric.counter(
  "scouting.opponent_match_data.query.error",
  {
    description: "Total opponent match data query failures",
    incremental: true,
  }
);

export const scoutingOpponentMatchDataQueryDuration = Metric.histogram(
  "scouting.opponent_match_data.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of opponent match data query duration in milliseconds"
);

export const scoutingTeamProfileQuerySuccessTotal = Metric.counter(
  "scouting.team_profile.query.success",
  {
    description: "Total successful scouting team profile queries",
    incremental: true,
  }
);

export const scoutingTeamProfileQueryErrorTotal = Metric.counter(
  "scouting.team_profile.query.error",
  {
    description: "Total scouting team profile query failures",
    incremental: true,
  }
);

export const scoutingTeamProfileQueryDuration = Metric.histogram(
  "scouting.team_profile.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of scouting team profile query duration in milliseconds"
);

export const strengthRatingsQuerySuccessTotal = Metric.counter(
  "scouting.strength_ratings.query.success",
  {
    description: "Total successful team strength ratings queries",
    incremental: true,
  }
);

export const strengthRatingsQueryErrorTotal = Metric.counter(
  "scouting.strength_ratings.query.error",
  {
    description: "Total team strength ratings query failures",
    incremental: true,
  }
);

export const strengthRatingsQueryDuration = Metric.histogram(
  "scouting.strength_ratings.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of team strength ratings query duration in milliseconds"
);

export const strengthRatingQuerySuccessTotal = Metric.counter(
  "scouting.strength_rating.query.success",
  {
    description: "Total successful single team strength rating queries",
    incremental: true,
  }
);

export const strengthRatingQueryErrorTotal = Metric.counter(
  "scouting.strength_rating.query.error",
  {
    description: "Total single team strength rating query failures",
    incremental: true,
  }
);

export const strengthRatingQueryDuration = Metric.histogram(
  "scouting.strength_rating.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of single team strength rating query duration in milliseconds"
);

export const strengthPercentileQuerySuccessTotal = Metric.counter(
  "scouting.strength_percentile.query.success",
  {
    description: "Total successful team strength percentile queries",
    incremental: true,
  }
);

export const strengthPercentileQueryErrorTotal = Metric.counter(
  "scouting.strength_percentile.query.error",
  {
    description: "Total team strength percentile query failures",
    incremental: true,
  }
);

export const strengthPercentileQueryDuration = Metric.histogram(
  "scouting.strength_percentile.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of team strength percentile query duration in milliseconds"
);

// cache metrics

export const scoutingCacheRequestTotal = Metric.counter(
  "scouting.cache.request",
  {
    description: "Total scouting data cache requests",
    incremental: true,
  }
);

export const scoutingCacheMissTotal = Metric.counter("scouting.cache.miss", {
  description: "Total scouting data cache misses (triggered lookup)",
  incremental: true,
});
