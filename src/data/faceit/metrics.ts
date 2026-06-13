import { Metric, MetricBoundaries } from "effect";

function dur(name: string, desc: string) {
  return Metric.histogram(
    name,
    MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
    desc
  );
}

export const faceitTeamsQuerySuccessTotal = Metric.counter(
  "faceit.teams.query.success",
  { description: "Successful FACEIT teams queries", incremental: true }
);
export const faceitTeamsQueryErrorTotal = Metric.counter(
  "faceit.teams.query.error",
  { description: "Failed FACEIT teams queries", incremental: true }
);
export const faceitTeamsQueryDuration = dur(
  "faceit.teams.query.duration_ms",
  "FACEIT teams query duration (ms)"
);

export const faceitTeamProfileQuerySuccessTotal = Metric.counter(
  "faceit.team_profile.query.success",
  { description: "Successful FACEIT team profile queries", incremental: true }
);
export const faceitTeamProfileQueryErrorTotal = Metric.counter(
  "faceit.team_profile.query.error",
  { description: "Failed FACEIT team profile queries", incremental: true }
);
export const faceitTeamProfileQueryDuration = dur(
  "faceit.team_profile.query.duration_ms",
  "FACEIT team profile query duration (ms)"
);

export const faceitCacheRequestTotal = Metric.counter(
  "faceit.cache.request",
  { description: "FACEIT scouting cache requests", incremental: true }
);
export const faceitCacheMissTotal = Metric.counter("faceit.cache.miss", {
  description: "FACEIT scouting cache misses",
  incremental: true,
});

export const faceitPlayersQuerySuccessTotal = Metric.counter(
  "faceit.players.query.success",
  { description: "Successful FACEIT players queries", incremental: true }
);
export const faceitPlayersQueryErrorTotal = Metric.counter(
  "faceit.players.query.error",
  { description: "Failed FACEIT players queries", incremental: true }
);
export const faceitPlayersQueryDuration = dur(
  "faceit.players.query.duration_ms",
  "FACEIT players query duration (ms)"
);

export const faceitPlayerProfileQuerySuccessTotal = Metric.counter(
  "faceit.player_profile.query.success",
  { description: "Successful FACEIT player profile queries", incremental: true }
);
export const faceitPlayerProfileQueryErrorTotal = Metric.counter(
  "faceit.player_profile.query.error",
  { description: "Failed FACEIT player profile queries", incremental: true }
);
export const faceitPlayerProfileQueryDuration = dur(
  "faceit.player_profile.query.duration_ms",
  "FACEIT player profile query duration (ms)"
);
