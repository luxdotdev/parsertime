import { Metric, MetricBoundaries } from "effect";

export const getTournamentSuccessTotal = Metric.counter(
  "tournament.get_tournament.query.success",
  {
    description: "Total successful getTournament queries",
    incremental: true,
  }
);

export const getTournamentErrorTotal = Metric.counter(
  "tournament.get_tournament.query.error",
  {
    description: "Total getTournament query failures",
    incremental: true,
  }
);

export const getTournamentDuration = Metric.histogram(
  "tournament.get_tournament.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of getTournament query duration in milliseconds"
);

export const getUserTournamentsSuccessTotal = Metric.counter(
  "tournament.get_user_tournaments.query.success",
  {
    description: "Total successful getUserTournaments queries",
    incremental: true,
  }
);

export const getUserTournamentsErrorTotal = Metric.counter(
  "tournament.get_user_tournaments.query.error",
  {
    description: "Total getUserTournaments query failures",
    incremental: true,
  }
);

export const getUserTournamentsDuration = Metric.histogram(
  "tournament.get_user_tournaments.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of getUserTournaments query duration in milliseconds"
);

export const getTournamentMatchSuccessTotal = Metric.counter(
  "tournament.get_tournament_match.query.success",
  {
    description: "Total successful getTournamentMatch queries",
    incremental: true,
  }
);

export const getTournamentMatchErrorTotal = Metric.counter(
  "tournament.get_tournament_match.query.error",
  {
    description: "Total getTournamentMatch query failures",
    incremental: true,
  }
);

export const getTournamentMatchDuration = Metric.histogram(
  "tournament.get_tournament_match.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of getTournamentMatch query duration in milliseconds"
);

export const getTournamentBracketSuccessTotal = Metric.counter(
  "tournament.get_tournament_bracket.query.success",
  {
    description: "Total successful getTournamentBracket queries",
    incremental: true,
  }
);

export const getTournamentBracketErrorTotal = Metric.counter(
  "tournament.get_tournament_bracket.query.error",
  {
    description: "Total getTournamentBracket query failures",
    incremental: true,
  }
);

export const getTournamentBracketDuration = Metric.histogram(
  "tournament.get_tournament_bracket.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of getTournamentBracket query duration in milliseconds"
);

export const getRRStandingsSuccessTotal = Metric.counter(
  "tournament.get_rr_standings.query.success",
  {
    description: "Total successful getRRStandings queries",
    incremental: true,
  }
);

export const getRRStandingsErrorTotal = Metric.counter(
  "tournament.get_rr_standings.query.error",
  {
    description: "Total getRRStandings query failures",
    incremental: true,
  }
);

export const getRRStandingsDuration = Metric.histogram(
  "tournament.get_rr_standings.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of getRRStandings query duration in milliseconds"
);

export const getBroadcastDataSuccessTotal = Metric.counter(
  "tournament.get_broadcast_data.query.success",
  {
    description: "Total successful getTournamentBroadcastData queries",
    incremental: true,
  }
);

export const getBroadcastDataErrorTotal = Metric.counter(
  "tournament.get_broadcast_data.query.error",
  {
    description: "Total getTournamentBroadcastData query failures",
    incremental: true,
  }
);

export const getBroadcastDataDuration = Metric.histogram(
  "tournament.get_broadcast_data.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of getTournamentBroadcastData query duration in milliseconds"
);

export const tournamentCacheRequestTotal = Metric.counter(
  "tournament.cache.request",
  {
    description: "Total tournament cache requests",
    incremental: true,
  }
);

export const tournamentCacheMissTotal = Metric.counter(
  "tournament.cache.miss",
  {
    description: "Total tournament cache misses",
    incremental: true,
  }
);

export const broadcastCacheRequestTotal = Metric.counter(
  "broadcast.cache.request",
  {
    description: "Total broadcast cache requests",
    incremental: true,
  }
);

export const broadcastCacheMissTotal = Metric.counter("broadcast.cache.miss", {
  description: "Total broadcast cache misses",
  incremental: true,
});
