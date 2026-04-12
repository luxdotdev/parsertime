import { EffectObservabilityLive } from "@/instrumentation";
import prisma from "@/lib/prisma";
import {
  calculateRRStandings,
  type TeamStanding,
} from "@/lib/tournaments/round-robin";
import { Cache, Context, Duration, Effect, Layer, Metric } from "effect";
import { TournamentQueryError } from "./errors";
import {
  getRRStandingsDuration,
  getRRStandingsErrorTotal,
  getRRStandingsSuccessTotal,
  getTournamentBracketDuration,
  getTournamentBracketErrorTotal,
  getTournamentBracketSuccessTotal,
  getTournamentDuration,
  getTournamentErrorTotal,
  getTournamentMatchDuration,
  getTournamentMatchErrorTotal,
  getTournamentMatchSuccessTotal,
  getTournamentSuccessTotal,
  getUserTournamentsDuration,
  getUserTournamentsErrorTotal,
  getUserTournamentsSuccessTotal,
  tournamentCacheRequestTotal,
  tournamentCacheMissTotal,
} from "./metrics";

import type { Prisma } from "@prisma/client";

type GetTournamentResult = Awaited<
  ReturnType<typeof prisma.tournament.findUnique>
>;

type GetUserTournamentsResult = Prisma.TournamentGetPayload<{
  include: {
    teams: { select: { name: true } };
    _count: { select: { matches: true } };
  };
}>[];

type GetTournamentMatchResult = Prisma.TournamentMatchGetPayload<{
  include: {
    tournament: true;
    round: true;
    team1: {
      include: {
        team: { select: { id: true; name: true; image: true } };
      };
    };
    team2: {
      include: {
        team: { select: { id: true; name: true; image: true } };
      };
    };
    winner: true;
    maps: {
      include: {
        map: {
          include: {
            mapData: {
              include: {
                match_start: true;
                match_end: true;
                round_end: true;
                HeroBan: true;
              };
            };
          };
        };
      };
    };
  };
}> | null;

type GetTournamentBracketResult = Prisma.TournamentGetPayload<{
  include: {
    teams: true;
    rounds: true;
    matches: {
      include: {
        team1: { select: { id: true; name: true; seed: true } };
        team2: { select: { id: true; name: true; seed: true } };
        winner: { select: { id: true; name: true } };
        round: {
          select: {
            roundNumber: true;
            roundName: true;
            bracket: true;
          };
        };
      };
    };
  };
}> | null;

export type TournamentServiceInterface = {
  readonly getTournament: (
    id: number
  ) => Effect.Effect<GetTournamentResult, TournamentQueryError>;

  readonly getUserTournaments: (
    userId: string
  ) => Effect.Effect<GetUserTournamentsResult, TournamentQueryError>;

  readonly getTournamentMatch: (
    matchId: number
  ) => Effect.Effect<GetTournamentMatchResult, TournamentQueryError>;

  readonly getTournamentBracket: (
    tournamentId: number
  ) => Effect.Effect<GetTournamentBracketResult, TournamentQueryError>;

  readonly getRRStandings: (
    tournamentId: number
  ) => Effect.Effect<TeamStanding[], TournamentQueryError>;

  readonly invalidateMatch: (matchId: number) => Effect.Effect<void>;
};

export class TournamentService extends Context.Tag(
  "@app/data/tournament/TournamentService"
)<TournamentService, TournamentServiceInterface>() {}

export const make: Effect.Effect<TournamentServiceInterface> = Effect.gen(
  function* () {
    function getTournament(
      id: number
    ): Effect.Effect<GetTournamentResult, TournamentQueryError> {
      const startTime = Date.now();
      const wideEvent: Record<string, unknown> = { tournamentId: id };

      return Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan("tournamentId", id);
        const result = yield* Effect.tryPromise({
          try: () =>
            prisma.tournament.findUnique({
              where: { id },
              include: {
                teams: {
                  include: {
                    team: { select: { id: true, name: true, image: true } },
                  },
                  orderBy: { seed: "asc" },
                },
                rounds: {
                  orderBy: [{ bracket: "asc" }, { roundNumber: "asc" }],
                },
                matches: {
                  include: {
                    team1: true,
                    team2: true,
                    winner: true,
                    round: true,
                    maps: {
                      include: { map: true },
                      orderBy: { gameNumber: "asc" },
                    },
                  },
                  orderBy: [{ roundId: "asc" }, { bracketPosition: "asc" }],
                },
              },
            }),
          catch: (error) =>
            new TournamentQueryError({
              operation: `fetch tournament with id: ${id}`,
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("tournament.getTournament.query", {
            attributes: { tournamentId: id },
          })
        );

        wideEvent.found = result !== null;
        wideEvent.outcome = "success";
        yield* Metric.increment(getTournamentSuccessTotal);
        return result;
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            wideEvent.outcome = "error";
            wideEvent.error_tag = error._tag;
            wideEvent.error_message = error.message;
          }).pipe(Effect.andThen(Metric.increment(getTournamentErrorTotal)))
        ),
        Effect.ensuring(
          Effect.suspend(() => {
            const durationMs = Date.now() - startTime;
            wideEvent.duration_ms = durationMs;
            wideEvent.outcome ??= "interrupted";
            const log =
              wideEvent.outcome === "error"
                ? Effect.logError("tournament.getTournament")
                : Effect.logInfo("tournament.getTournament");
            return log.pipe(
              Effect.annotateLogs(wideEvent),
              Effect.andThen(getTournamentDuration(Effect.succeed(durationMs)))
            );
          })
        ),
        Effect.withSpan("tournament.getTournament")
      );
    }

    function getUserTournaments(
      userId: string
    ): Effect.Effect<GetUserTournamentsResult, TournamentQueryError> {
      const startTime = Date.now();
      const wideEvent: Record<string, unknown> = { userId };

      return Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan("userId", userId);
        const result = yield* Effect.tryPromise({
          try: () =>
            prisma.tournament.findMany({
              where: {
                OR: [
                  { creatorId: userId },
                  {
                    teams: {
                      some: { team: { users: { some: { id: userId } } } },
                    },
                  },
                ],
              },
              include: {
                teams: { select: { name: true }, orderBy: { seed: "asc" } },
                _count: { select: { matches: true } },
              },
              orderBy: { createdAt: "desc" },
            }),
          catch: (error) =>
            new TournamentQueryError({
              operation: `fetch tournaments for user: ${userId}`,
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("tournament.getUserTournaments.query", {
            attributes: { userId },
          })
        );

        wideEvent.count = result.length;
        wideEvent.outcome = "success";
        yield* Metric.increment(getUserTournamentsSuccessTotal);
        return result;
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            wideEvent.outcome = "error";
            wideEvent.error_tag = error._tag;
            wideEvent.error_message = error.message;
          }).pipe(
            Effect.andThen(Metric.increment(getUserTournamentsErrorTotal))
          )
        ),
        Effect.ensuring(
          Effect.suspend(() => {
            const durationMs = Date.now() - startTime;
            wideEvent.duration_ms = durationMs;
            wideEvent.outcome ??= "interrupted";
            const log =
              wideEvent.outcome === "error"
                ? Effect.logError("tournament.getUserTournaments")
                : Effect.logInfo("tournament.getUserTournaments");
            return log.pipe(
              Effect.annotateLogs(wideEvent),
              Effect.andThen(
                getUserTournamentsDuration(Effect.succeed(durationMs))
              )
            );
          })
        ),
        Effect.withSpan("tournament.getUserTournaments")
      );
    }

    function getTournamentMatch(
      matchId: number
    ): Effect.Effect<GetTournamentMatchResult, TournamentQueryError> {
      const startTime = Date.now();
      const wideEvent: Record<string, unknown> = { matchId };

      return Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan("matchId", matchId);
        const result = yield* Effect.tryPromise({
          try: () =>
            prisma.tournamentMatch.findUnique({
              where: { id: matchId },
              include: {
                tournament: true,
                round: true,
                team1: {
                  include: {
                    team: { select: { id: true, name: true, image: true } },
                  },
                },
                team2: {
                  include: {
                    team: { select: { id: true, name: true, image: true } },
                  },
                },
                winner: true,
                maps: {
                  include: {
                    map: {
                      include: {
                        mapData: {
                          include: {
                            match_start: true,
                            match_end: true,
                            round_end: true,
                            HeroBan: true,
                          },
                        },
                      },
                    },
                  },
                  orderBy: { gameNumber: "asc" },
                },
              },
            }),
          catch: (error) =>
            new TournamentQueryError({
              operation: `fetch tournament match with id: ${matchId}`,
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("tournament.getTournamentMatch.query", {
            attributes: { matchId },
          })
        );

        wideEvent.found = result !== null;
        wideEvent.outcome = "success";
        yield* Metric.increment(getTournamentMatchSuccessTotal);
        return result;
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            wideEvent.outcome = "error";
            wideEvent.error_tag = error._tag;
            wideEvent.error_message = error.message;
          }).pipe(
            Effect.andThen(Metric.increment(getTournamentMatchErrorTotal))
          )
        ),
        Effect.ensuring(
          Effect.suspend(() => {
            const durationMs = Date.now() - startTime;
            wideEvent.duration_ms = durationMs;
            wideEvent.outcome ??= "interrupted";
            const log =
              wideEvent.outcome === "error"
                ? Effect.logError("tournament.getTournamentMatch")
                : Effect.logInfo("tournament.getTournamentMatch");
            return log.pipe(
              Effect.annotateLogs(wideEvent),
              Effect.andThen(
                getTournamentMatchDuration(Effect.succeed(durationMs))
              )
            );
          })
        ),
        Effect.withSpan("tournament.getTournamentMatch")
      );
    }

    function getTournamentBracket(
      tournamentId: number
    ): Effect.Effect<GetTournamentBracketResult, TournamentQueryError> {
      const startTime = Date.now();
      const wideEvent: Record<string, unknown> = { tournamentId };

      return Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan("tournamentId", tournamentId);
        const result = yield* Effect.tryPromise({
          try: () =>
            prisma.tournament.findUnique({
              where: { id: tournamentId },
              include: {
                teams: { orderBy: { seed: "asc" } },
                rounds: {
                  orderBy: [{ bracket: "asc" }, { roundNumber: "asc" }],
                },
                matches: {
                  include: {
                    team1: { select: { id: true, name: true, seed: true } },
                    team2: { select: { id: true, name: true, seed: true } },
                    winner: { select: { id: true, name: true } },
                    round: {
                      select: {
                        roundNumber: true,
                        roundName: true,
                        bracket: true,
                      },
                    },
                  },
                  orderBy: [{ roundId: "asc" }, { bracketPosition: "asc" }],
                },
              },
            }),
          catch: (error) =>
            new TournamentQueryError({
              operation: `fetch tournament bracket for id: ${tournamentId}`,
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("tournament.getTournamentBracket.query", {
            attributes: { tournamentId },
          })
        );

        wideEvent.found = result !== null;
        wideEvent.outcome = "success";
        yield* Metric.increment(getTournamentBracketSuccessTotal);
        return result;
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            wideEvent.outcome = "error";
            wideEvent.error_tag = error._tag;
            wideEvent.error_message = error.message;
          }).pipe(
            Effect.andThen(Metric.increment(getTournamentBracketErrorTotal))
          )
        ),
        Effect.ensuring(
          Effect.suspend(() => {
            const durationMs = Date.now() - startTime;
            wideEvent.duration_ms = durationMs;
            wideEvent.outcome ??= "interrupted";
            const log =
              wideEvent.outcome === "error"
                ? Effect.logError("tournament.getTournamentBracket")
                : Effect.logInfo("tournament.getTournamentBracket");
            return log.pipe(
              Effect.annotateLogs(wideEvent),
              Effect.andThen(
                getTournamentBracketDuration(Effect.succeed(durationMs))
              )
            );
          })
        ),
        Effect.withSpan("tournament.getTournamentBracket")
      );
    }

    function getRRStandings(
      tournamentId: number
    ): Effect.Effect<TeamStanding[], TournamentQueryError> {
      const startTime = Date.now();
      const wideEvent: Record<string, unknown> = { tournamentId };

      return Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan("tournamentId", tournamentId);
        const result = yield* Effect.tryPromise({
          try: () => calculateRRStandings(tournamentId),
          catch: (error) =>
            new TournamentQueryError({
              operation: `calculate round-robin standings for tournament: ${tournamentId}`,
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("tournament.getRRStandings.query", {
            attributes: { tournamentId },
          })
        );

        wideEvent.team_count = result.length;
        wideEvent.outcome = "success";
        yield* Metric.increment(getRRStandingsSuccessTotal);
        return result;
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            wideEvent.outcome = "error";
            wideEvent.error_tag = error._tag;
            wideEvent.error_message = error.message;
          }).pipe(Effect.andThen(Metric.increment(getRRStandingsErrorTotal)))
        ),
        Effect.ensuring(
          Effect.suspend(() => {
            const durationMs = Date.now() - startTime;
            wideEvent.duration_ms = durationMs;
            wideEvent.outcome ??= "interrupted";
            const log =
              wideEvent.outcome === "error"
                ? Effect.logError("tournament.getRRStandings")
                : Effect.logInfo("tournament.getRRStandings");
            return log.pipe(
              Effect.annotateLogs(wideEvent),
              Effect.andThen(getRRStandingsDuration(Effect.succeed(durationMs)))
            );
          })
        ),
        Effect.withSpan("tournament.getRRStandings")
      );
    }

    const getTournamentCache = yield* Cache.make({
      capacity: 64,
      timeToLive: Duration.seconds(30),
      lookup: (id: number) =>
        getTournament(id).pipe(
          Effect.tap(() => Metric.increment(tournamentCacheMissTotal))
        ),
    });

    const getUserTournamentsCache = yield* Cache.make({
      capacity: 64,
      timeToLive: Duration.seconds(30),
      lookup: (userId: string) =>
        getUserTournaments(userId).pipe(
          Effect.tap(() => Metric.increment(tournamentCacheMissTotal))
        ),
    });

    const getTournamentMatchCache = yield* Cache.make({
      capacity: 64,
      timeToLive: Duration.seconds(30),
      lookup: (matchId: number) =>
        getTournamentMatch(matchId).pipe(
          Effect.tap(() => Metric.increment(tournamentCacheMissTotal))
        ),
    });

    const getTournamentBracketCache = yield* Cache.make({
      capacity: 64,
      timeToLive: Duration.seconds(30),
      lookup: (tournamentId: number) =>
        getTournamentBracket(tournamentId).pipe(
          Effect.tap(() => Metric.increment(tournamentCacheMissTotal))
        ),
    });

    const getRRStandingsCache = yield* Cache.make({
      capacity: 64,
      timeToLive: Duration.seconds(30),
      lookup: (tournamentId: number) =>
        getRRStandings(tournamentId).pipe(
          Effect.tap(() => Metric.increment(tournamentCacheMissTotal))
        ),
    });

    return {
      getTournament: (id: number) =>
        getTournamentCache
          .get(id)
          .pipe(
            Effect.tap(() => Metric.increment(tournamentCacheRequestTotal))
          ),
      getUserTournaments: (userId: string) =>
        getUserTournamentsCache
          .get(userId)
          .pipe(
            Effect.tap(() => Metric.increment(tournamentCacheRequestTotal))
          ),
      getTournamentMatch: (matchId: number) =>
        getTournamentMatchCache
          .get(matchId)
          .pipe(
            Effect.tap(() => Metric.increment(tournamentCacheRequestTotal))
          ),
      getTournamentBracket: (tournamentId: number) =>
        getTournamentBracketCache
          .get(tournamentId)
          .pipe(
            Effect.tap(() => Metric.increment(tournamentCacheRequestTotal))
          ),
      getRRStandings: (tournamentId: number) =>
        getRRStandingsCache
          .get(tournamentId)
          .pipe(
            Effect.tap(() => Metric.increment(tournamentCacheRequestTotal))
          ),
      invalidateMatch: (matchId: number) =>
        getTournamentMatchCache.invalidate(matchId),
    } satisfies TournamentServiceInterface;
  }
);

export const TournamentServiceLive = Layer.effect(TournamentService, make).pipe(
  Layer.provide(EffectObservabilityLive)
);
