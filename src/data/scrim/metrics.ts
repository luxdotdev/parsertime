import { Metric, MetricBoundaries } from "effect";

// scrim-service

export const scrimGetScrimSuccessTotal = Metric.counter(
  "scrim.get_scrim.query.success",
  {
    description: "Total successful getScrim queries",
    incremental: true,
  }
);

export const scrimGetScrimErrorTotal = Metric.counter(
  "scrim.get_scrim.query.error",
  {
    description: "Total getScrim query failures",
    incremental: true,
  }
);

export const scrimGetScrimDuration = Metric.histogram(
  "scrim.get_scrim.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of getScrim query duration in milliseconds"
);

export const scrimGetUserViewableScrimsSuccessTotal = Metric.counter(
  "scrim.get_user_viewable_scrims.query.success",
  {
    description: "Total successful getUserViewableScrims queries",
    incremental: true,
  }
);

export const scrimGetUserViewableScrimsErrorTotal = Metric.counter(
  "scrim.get_user_viewable_scrims.query.error",
  {
    description: "Total getUserViewableScrims query failures",
    incremental: true,
  }
);

export const scrimGetUserViewableScrimsDuration = Metric.histogram(
  "scrim.get_user_viewable_scrims.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of getUserViewableScrims query duration in milliseconds"
);

export const scrimGetFinalRoundStatsSuccessTotal = Metric.counter(
  "scrim.get_final_round_stats.query.success",
  {
    description: "Total successful getFinalRoundStats queries",
    incremental: true,
  }
);

export const scrimGetFinalRoundStatsErrorTotal = Metric.counter(
  "scrim.get_final_round_stats.query.error",
  {
    description: "Total getFinalRoundStats query failures",
    incremental: true,
  }
);

export const scrimGetFinalRoundStatsDuration = Metric.histogram(
  "scrim.get_final_round_stats.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of getFinalRoundStats query duration in milliseconds"
);

export const scrimGetFinalRoundStatsForPlayerSuccessTotal = Metric.counter(
  "scrim.get_final_round_stats_for_player.query.success",
  {
    description: "Total successful getFinalRoundStatsForPlayer queries",
    incremental: true,
  }
);

export const scrimGetFinalRoundStatsForPlayerErrorTotal = Metric.counter(
  "scrim.get_final_round_stats_for_player.query.error",
  {
    description: "Total getFinalRoundStatsForPlayer query failures",
    incremental: true,
  }
);

export const scrimGetFinalRoundStatsForPlayerDuration = Metric.histogram(
  "scrim.get_final_round_stats_for_player.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of getFinalRoundStatsForPlayer query duration in milliseconds"
);

// getAllStatsForPlayer
export const scrimGetAllStatsForPlayerSuccessTotal = Metric.counter(
  "scrim.get_all_stats_for_player.query.success",
  {
    description: "Total successful getAllStatsForPlayer queries",
    incremental: true,
  }
);

export const scrimGetAllStatsForPlayerErrorTotal = Metric.counter(
  "scrim.get_all_stats_for_player.query.error",
  {
    description: "Total getAllStatsForPlayer query failures",
    incremental: true,
  }
);

export const scrimGetAllStatsForPlayerDuration = Metric.histogram(
  "scrim.get_all_stats_for_player.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of getAllStatsForPlayer query duration in milliseconds"
);

// getAllKillsForPlayer
export const scrimGetAllKillsForPlayerSuccessTotal = Metric.counter(
  "scrim.get_all_kills_for_player.query.success",
  {
    description: "Total successful getAllKillsForPlayer queries",
    incremental: true,
  }
);

export const scrimGetAllKillsForPlayerErrorTotal = Metric.counter(
  "scrim.get_all_kills_for_player.query.error",
  {
    description: "Total getAllKillsForPlayer query failures",
    incremental: true,
  }
);

export const scrimGetAllKillsForPlayerDuration = Metric.histogram(
  "scrim.get_all_kills_for_player.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of getAllKillsForPlayer query duration in milliseconds"
);

// getAllDeathsForPlayer
export const scrimGetAllDeathsForPlayerSuccessTotal = Metric.counter(
  "scrim.get_all_deaths_for_player.query.success",
  {
    description: "Total successful getAllDeathsForPlayer queries",
    incremental: true,
  }
);

export const scrimGetAllDeathsForPlayerErrorTotal = Metric.counter(
  "scrim.get_all_deaths_for_player.query.error",
  {
    description: "Total getAllDeathsForPlayer query failures",
    incremental: true,
  }
);

export const scrimGetAllDeathsForPlayerDuration = Metric.histogram(
  "scrim.get_all_deaths_for_player.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of getAllDeathsForPlayer query duration in milliseconds"
);

// getAllMapWinratesForPlayer
export const scrimGetAllMapWinratesForPlayerSuccessTotal = Metric.counter(
  "scrim.get_all_map_winrates_for_player.query.success",
  {
    description: "Total successful getAllMapWinratesForPlayer queries",
    incremental: true,
  }
);

export const scrimGetAllMapWinratesForPlayerErrorTotal = Metric.counter(
  "scrim.get_all_map_winrates_for_player.query.error",
  {
    description: "Total getAllMapWinratesForPlayer query failures",
    incremental: true,
  }
);

export const scrimGetAllMapWinratesForPlayerDuration = Metric.histogram(
  "scrim.get_all_map_winrates_for_player.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of getAllMapWinratesForPlayer query duration in milliseconds"
);

// overview-service

export const scrimOverviewSuccessTotal = Metric.counter(
  "scrim.overview.query.success",
  {
    description: "Total successful scrim overview queries",
    incremental: true,
  }
);

export const scrimOverviewErrorTotal = Metric.counter(
  "scrim.overview.query.error",
  {
    description: "Total scrim overview query failures",
    incremental: true,
  }
);

export const scrimOverviewDuration = Metric.histogram(
  "scrim.overview.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of scrim overview query duration in milliseconds"
);

// opponent-service

export const scrimOpponentMapResultsSuccessTotal = Metric.counter(
  "scrim.opponent.map_results.query.success",
  {
    description: "Total successful opponent scrim map results queries",
    incremental: true,
  }
);

export const scrimOpponentMapResultsErrorTotal = Metric.counter(
  "scrim.opponent.map_results.query.error",
  {
    description: "Total opponent scrim map results query failures",
    incremental: true,
  }
);

export const scrimOpponentMapResultsDuration = Metric.histogram(
  "scrim.opponent.map_results.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of opponent scrim map results query duration in milliseconds"
);

export const scrimOpponentHeroBansSuccessTotal = Metric.counter(
  "scrim.opponent.hero_bans.query.success",
  {
    description: "Total successful opponent scrim hero bans queries",
    incremental: true,
  }
);

export const scrimOpponentHeroBansErrorTotal = Metric.counter(
  "scrim.opponent.hero_bans.query.error",
  {
    description: "Total opponent scrim hero bans query failures",
    incremental: true,
  }
);

export const scrimOpponentHeroBansDuration = Metric.histogram(
  "scrim.opponent.hero_bans.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of opponent scrim hero bans query duration in milliseconds"
);

export const scrimOpponentPlayerStatsSuccessTotal = Metric.counter(
  "scrim.opponent.player_stats.query.success",
  {
    description: "Total successful opponent scrim player stats queries",
    incremental: true,
  }
);

export const scrimOpponentPlayerStatsErrorTotal = Metric.counter(
  "scrim.opponent.player_stats.query.error",
  {
    description: "Total opponent scrim player stats query failures",
    incremental: true,
  }
);

export const scrimOpponentPlayerStatsDuration = Metric.histogram(
  "scrim.opponent.player_stats.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of opponent scrim player stats query duration in milliseconds"
);

// ability-timing-service

export const scrimAbilityTimingSuccessTotal = Metric.counter(
  "scrim.ability_timing.query.success",
  {
    description: "Total successful scrim ability timing queries",
    incremental: true,
  }
);

export const scrimAbilityTimingErrorTotal = Metric.counter(
  "scrim.ability_timing.query.error",
  {
    description: "Total scrim ability timing query failures",
    incremental: true,
  }
);

export const scrimAbilityTimingDuration = Metric.histogram(
  "scrim.ability_timing.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of scrim ability timing query duration in milliseconds"
);

export const scrimFightTimelinesSuccessTotal = Metric.counter(
  "scrim.fight_timelines.query.success",
  {
    description: "Total successful scrim fight timelines queries",
    incremental: true,
  }
);

export const scrimFightTimelinesErrorTotal = Metric.counter(
  "scrim.fight_timelines.query.error",
  {
    description: "Total scrim fight timelines query failures",
    incremental: true,
  }
);

export const scrimFightTimelinesDuration = Metric.histogram(
  "scrim.fight_timelines.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of scrim fight timelines query duration in milliseconds"
);

export const scrimMapAbilityTimingSuccessTotal = Metric.counter(
  "scrim.map_ability_timing.query.success",
  {
    description: "Total successful map ability timing queries",
    incremental: true,
  }
);

export const scrimMapAbilityTimingErrorTotal = Metric.counter(
  "scrim.map_ability_timing.query.error",
  {
    description: "Total map ability timing query failures",
    incremental: true,
  }
);

export const scrimMapAbilityTimingDuration = Metric.histogram(
  "scrim.map_ability_timing.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of map ability timing query duration in milliseconds"
);

// cache metrics

export const scrimCacheRequestTotal = Metric.counter("scrim.cache.request", {
  description: "Total scrim data cache requests",
  incremental: true,
});

export const scrimCacheMissTotal = Metric.counter("scrim.cache.miss", {
  description: "Total scrim data cache misses (triggered lookup)",
  incremental: true,
});
