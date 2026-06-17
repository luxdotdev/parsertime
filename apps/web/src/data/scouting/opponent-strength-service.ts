import { EffectObservabilityLive } from "@/instrumentation";
import prisma from "@/lib/prisma";
import { Cache, Context, Duration, Effect, Layer, Metric } from "effect";
import { ScoutingQueryError } from "./errors";
import {
  scoutingCacheRequestTotal,
  scoutingCacheMissTotal,
  strengthPercentileQueryDuration,
  strengthPercentileQueryErrorTotal,
  strengthPercentileQuerySuccessTotal,
  strengthRatingQueryDuration,
  strengthRatingQueryErrorTotal,
  strengthRatingQuerySuccessTotal,
  strengthRatingsQueryDuration,
  strengthRatingsQueryErrorTotal,
  strengthRatingsQuerySuccessTotal,
} from "./metrics";
import type { TeamStrengthRating } from "./types";

const INITIAL_RATING = 1500;

/**
 * K-factor decays as sample size grows. Early matches have more volatility;
 * established teams converge toward stable ratings.
 */
function kFactor(matchesPlayed: number): number {
  if (matchesPlayed < 5) return 48;
  if (matchesPlayed < 15) return 32;
  if (matchesPlayed < 30) return 24;
  return 16;
}

function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

type MatchRecord = {
  matchDate: Date;
  team1: string;
  team1FullName: string;
  team2: string;
  team2FullName: string;
  winner: string | null;
};

export type OpponentStrengthServiceInterface = {
  readonly getTeamStrengthRatings: () => Effect.Effect<
    TeamStrengthRating[],
    ScoutingQueryError
  >;

  readonly getTeamStrengthRating: (
    teamAbbr: string
  ) => Effect.Effect<TeamStrengthRating | null, ScoutingQueryError>;

  readonly getTeamStrengthPercentile: (
    teamAbbr: string
  ) => Effect.Effect<number | null, ScoutingQueryError>;
};

export class OpponentStrengthService extends Context.Tag(
  "@app/data/scouting/OpponentStrengthService"
)<OpponentStrengthService, OpponentStrengthServiceInterface>() {}

const CACHE_TTL = Duration.seconds(30);
const CACHE_CAPACITY = 64;

export const make: Effect.Effect<OpponentStrengthServiceInterface> = Effect.gen(
  function* () {
    function getTeamStrengthRatings(): Effect.Effect<
      TeamStrengthRating[],
      ScoutingQueryError
    > {
      const startTime = Date.now();
      const wideEvent: Record<string, unknown> = {};

      return Effect.gen(function* () {
        const matches = yield* Effect.tryPromise({
          try: () =>
            prisma.scoutingMatch.findMany({
              select: {
                matchDate: true,
                team1: true,
                team1FullName: true,
                team2: true,
                team2FullName: true,
                winner: true,
              },
              orderBy: { matchDate: "asc" },
            }),
          catch: (error) =>
            new ScoutingQueryError({
              operation: "fetch matches for strength ratings",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("scouting.strengthRatings.fetchMatches", {
            attributes: {},
          })
        );

        const ratings = new Map<string, number>();
        const fullNames = new Map<string, string>();
        const matchCounts = new Map<string, number>();
        const histories = new Map<string, { date: Date; rating: number }[]>();

        function ensureTeam(abbr: string, name: string) {
          if (!ratings.has(abbr)) {
            ratings.set(abbr, INITIAL_RATING);
            fullNames.set(abbr, name);
            matchCounts.set(abbr, 0);
            histories.set(abbr, []);
          }
        }

        function recordHistory(abbr: string, date: Date) {
          const history = histories.get(abbr)!;
          history.push({ date, rating: ratings.get(abbr)! });
        }

        for (const match of matches as MatchRecord[]) {
          ensureTeam(match.team1, match.team1FullName);
          ensureTeam(match.team2, match.team2FullName);

          if (!match.winner) continue;

          const r1 = ratings.get(match.team1)!;
          const r2 = ratings.get(match.team2)!;
          const n1 = matchCounts.get(match.team1)!;
          const n2 = matchCounts.get(match.team2)!;

          const e1 = expectedScore(r1, r2);
          const e2 = 1 - e1;
          const s1 = match.winner === match.team1 ? 1 : 0;
          const s2 = 1 - s1;

          const k1 = kFactor(n1);
          const k2 = kFactor(n2);

          ratings.set(match.team1, r1 + k1 * (s1 - e1));
          ratings.set(match.team2, r2 + k2 * (s2 - e2));

          matchCounts.set(match.team1, n1 + 1);
          matchCounts.set(match.team2, n2 + 1);

          recordHistory(match.team1, match.matchDate);
          recordHistory(match.team2, match.matchDate);
        }

        const result = Array.from(ratings.entries())
          .map(([teamAbbr, rating]) => ({
            teamAbbr,
            fullName: fullNames.get(teamAbbr)!,
            rating: Math.round(rating),
            matchesRated: matchCounts.get(teamAbbr)!,
            ratingHistory: histories.get(teamAbbr)!,
          }))
          .sort((a, b) => b.rating - a.rating);

        wideEvent.team_count = result.length;
        wideEvent.match_count = matches.length;
        wideEvent.outcome = "success";
        yield* Metric.increment(strengthRatingsQuerySuccessTotal);
        return result;
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            wideEvent.outcome = "error";
            wideEvent.error_tag = error._tag;
            wideEvent.error_message = error.message;
          }).pipe(
            Effect.andThen(Metric.increment(strengthRatingsQueryErrorTotal))
          )
        ),
        Effect.ensuring(
          Effect.suspend(() => {
            const durationMs = Date.now() - startTime;
            wideEvent.duration_ms = durationMs;
            wideEvent.outcome ??= "interrupted";
            const log =
              wideEvent.outcome === "error"
                ? Effect.logError("scouting.getTeamStrengthRatings")
                : Effect.logInfo("scouting.getTeamStrengthRatings");
            return log.pipe(
              Effect.annotateLogs(wideEvent),
              Effect.andThen(
                strengthRatingsQueryDuration(Effect.succeed(durationMs))
              )
            );
          })
        ),
        Effect.withSpan("scouting.getTeamStrengthRatings")
      );
    }

    function getTeamStrengthRating(
      teamAbbr: string
    ): Effect.Effect<TeamStrengthRating | null, ScoutingQueryError> {
      const startTime = Date.now();
      const wideEvent: Record<string, unknown> = { teamAbbr };

      return Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan("teamAbbr", teamAbbr);
        const ratings = yield* getTeamStrengthRatings();
        const found = ratings.find((r) => r.teamAbbr === teamAbbr) ?? null;

        wideEvent.found = found !== null;
        if (found) {
          wideEvent.rating = found.rating;
          wideEvent.matches_rated = found.matchesRated;
        }
        wideEvent.outcome = "success";
        yield* Metric.increment(strengthRatingQuerySuccessTotal);
        return found;
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            wideEvent.outcome = "error";
            wideEvent.error_tag = error._tag;
            wideEvent.error_message = error.message;
          }).pipe(
            Effect.andThen(Metric.increment(strengthRatingQueryErrorTotal))
          )
        ),
        Effect.ensuring(
          Effect.suspend(() => {
            const durationMs = Date.now() - startTime;
            wideEvent.duration_ms = durationMs;
            wideEvent.outcome ??= "interrupted";
            const log =
              wideEvent.outcome === "error"
                ? Effect.logError("scouting.getTeamStrengthRating")
                : Effect.logInfo("scouting.getTeamStrengthRating");
            return log.pipe(
              Effect.annotateLogs(wideEvent),
              Effect.andThen(
                strengthRatingQueryDuration(Effect.succeed(durationMs))
              )
            );
          })
        ),
        Effect.withSpan("scouting.getTeamStrengthRating")
      );
    }

    function getTeamStrengthPercentile(
      teamAbbr: string
    ): Effect.Effect<number | null, ScoutingQueryError> {
      const startTime = Date.now();
      const wideEvent: Record<string, unknown> = { teamAbbr };

      return Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan("teamAbbr", teamAbbr);
        const ratings = yield* getTeamStrengthRatings();
        const index = ratings.findIndex((r) => r.teamAbbr === teamAbbr);

        if (index === -1) {
          wideEvent.found = false;
          wideEvent.outcome = "success";
          yield* Metric.increment(strengthPercentileQuerySuccessTotal);
          return null;
        }

        const percentile =
          ratings.length <= 1
            ? 100
            : Math.round(
                ((ratings.length - 1 - index) / (ratings.length - 1)) * 100
              );

        wideEvent.found = true;
        wideEvent.percentile = percentile;
        wideEvent.total_teams = ratings.length;
        wideEvent.outcome = "success";
        yield* Metric.increment(strengthPercentileQuerySuccessTotal);
        return percentile;
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            wideEvent.outcome = "error";
            wideEvent.error_tag = error._tag;
            wideEvent.error_message = error.message;
          }).pipe(
            Effect.andThen(Metric.increment(strengthPercentileQueryErrorTotal))
          )
        ),
        Effect.ensuring(
          Effect.suspend(() => {
            const durationMs = Date.now() - startTime;
            wideEvent.duration_ms = durationMs;
            wideEvent.outcome ??= "interrupted";
            const log =
              wideEvent.outcome === "error"
                ? Effect.logError("scouting.getTeamStrengthPercentile")
                : Effect.logInfo("scouting.getTeamStrengthPercentile");
            return log.pipe(
              Effect.annotateLogs(wideEvent),
              Effect.andThen(
                strengthPercentileQueryDuration(Effect.succeed(durationMs))
              )
            );
          })
        ),
        Effect.withSpan("scouting.getTeamStrengthPercentile")
      );
    }

    const strengthRatingsCache = yield* Cache.make({
      capacity: CACHE_CAPACITY,
      timeToLive: CACHE_TTL,
      lookup: (_key: string) =>
        getTeamStrengthRatings().pipe(
          Effect.tap(() => Metric.increment(scoutingCacheMissTotal))
        ),
    });

    const strengthRatingCache = yield* Cache.make({
      capacity: CACHE_CAPACITY,
      timeToLive: CACHE_TTL,
      lookup: (teamAbbr: string) =>
        getTeamStrengthRating(teamAbbr).pipe(
          Effect.tap(() => Metric.increment(scoutingCacheMissTotal))
        ),
    });

    const strengthPercentileCache = yield* Cache.make({
      capacity: CACHE_CAPACITY,
      timeToLive: CACHE_TTL,
      lookup: (teamAbbr: string) =>
        getTeamStrengthPercentile(teamAbbr).pipe(
          Effect.tap(() => Metric.increment(scoutingCacheMissTotal))
        ),
    });

    return {
      getTeamStrengthRatings: () =>
        strengthRatingsCache
          .get("__all__")
          .pipe(Effect.tap(() => Metric.increment(scoutingCacheRequestTotal))),
      getTeamStrengthRating: (teamAbbr: string) =>
        strengthRatingCache
          .get(teamAbbr)
          .pipe(Effect.tap(() => Metric.increment(scoutingCacheRequestTotal))),
      getTeamStrengthPercentile: (teamAbbr: string) =>
        strengthPercentileCache
          .get(teamAbbr)
          .pipe(Effect.tap(() => Metric.increment(scoutingCacheRequestTotal))),
    } satisfies OpponentStrengthServiceInterface;
  }
);

export const OpponentStrengthServiceLive = Layer.effect(
  OpponentStrengthService,
  make
).pipe(Layer.provide(EffectObservabilityLive));
