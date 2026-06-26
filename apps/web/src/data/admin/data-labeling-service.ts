import { EffectObservabilityLive } from "@/instrumentation";
import prisma from "@/lib/prisma";
import { Cache, Context, Duration, Effect, Layer, Metric } from "effect";
import { DataLabelingQueryError, MatchNotFoundError } from "./errors";
import {
  matchForLabelingQueryDuration,
  matchForLabelingQueryErrorTotal,
  matchForLabelingQuerySuccessTotal,
  unlabeledMatchesQueryDuration,
  unlabeledMatchesQueryErrorTotal,
  unlabeledMatchesQuerySuccessTotal,
  adminCacheRequestTotal,
  adminCacheMissTotal,
} from "./metrics";
import type {
  MatchForLabeling,
  RosterPlayerForLabeling,
  UnlabeledMatchesResult,
} from "./types";

export type DataLabelingServiceInterface = {
  readonly getUnlabeledMatches: (
    page: number,
    pageSize: number
  ) => Effect.Effect<UnlabeledMatchesResult, DataLabelingQueryError>;

  readonly getMatchForLabeling: (
    matchId: number
  ) => Effect.Effect<
    MatchForLabeling,
    DataLabelingQueryError | MatchNotFoundError
  >;
};

export class DataLabelingService extends Context.Tag(
  "@app/data/admin/DataLabelingService"
)<DataLabelingService, DataLabelingServiceInterface>() {}

export const make: Effect.Effect<DataLabelingServiceInterface> = Effect.gen(
  function* () {
    function getRosterPlayers(
      tournamentId: number,
      teamFullName: string
    ): Effect.Effect<RosterPlayerForLabeling[], DataLabelingQueryError> {
      return Effect.tryPromise({
        try: () =>
          prisma.scoutingRoster
            .findUnique({
              where: {
                tournamentId_teamName: {
                  tournamentId,
                  teamName: teamFullName,
                },
              },
              include: {
                players: {
                  where: { category: { in: ["player", "substitute"] } },
                  select: { id: true, displayName: true, role: true },
                  orderBy: { id: "asc" },
                },
              },
            })
            .then((roster) => roster?.players ?? []),
        catch: (error) =>
          new DataLabelingQueryError({
            operation: `fetch roster players for tournament=${tournamentId} team=${teamFullName}`,
            cause: error,
          }),
      }).pipe(
        Effect.withSpan("admin.getRosterPlayers", {
          attributes: { tournamentId, teamFullName },
        })
      );
    }

    function getUnlabeledMatches(
      page: number,
      pageSize: number
    ): Effect.Effect<UnlabeledMatchesResult, DataLabelingQueryError> {
      const startTime = Date.now();
      const wideEvent: Record<string, unknown> = { page, pageSize };

      return Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan("page", page);
        yield* Effect.annotateCurrentSpan("pageSize", pageSize);
        const where = {
          NOT: { vods: { equals: "[]" as unknown as undefined } },
          maps: {
            some: {
              OR: [
                { team1Comp: { isEmpty: true } },
                { team2Comp: { isEmpty: true } },
              ],
            },
          },
        };

        const [matches, totalCount] = yield* Effect.tryPromise({
          try: () =>
            Promise.all([
              prisma.scoutingMatch.findMany({
                where,
                include: {
                  maps: {
                    select: { id: true, team1Comp: true, team2Comp: true },
                  },
                  tournament: { select: { title: true } },
                },
                orderBy: { matchDate: "desc" },
                skip: page * pageSize,
                take: pageSize,
              }),
              prisma.scoutingMatch.count({ where }),
            ]),
          catch: (error) =>
            new DataLabelingQueryError({
              operation: "fetch unlabeled matches",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("admin.unlabeledMatches.fetchData", {
            attributes: { page, pageSize },
          })
        );

        wideEvent.totalCount = totalCount;
        wideEvent.matchCount = matches.length;

        const result: UnlabeledMatchesResult = {
          matches: matches.map((m) => {
            const vods = m.vods as { url: string; platform: string }[];
            const labeledMaps = m.maps.filter(
              (map) => map.team1Comp.length > 0 && map.team2Comp.length > 0
            ).length;

            return {
              id: m.id,
              team1: m.team1,
              team1FullName: m.team1FullName,
              team2: m.team2,
              team2FullName: m.team2FullName,
              team1Score: m.team1Score,
              team2Score: m.team2Score,
              matchDate: m.matchDate,
              tournament: m.tournament.title,
              vodCount: vods.length,
              labeledMaps,
              totalMaps: m.maps.length,
            };
          }),
          totalCount,
          page,
          pageSize,
        };

        wideEvent.outcome = "success";
        yield* Metric.increment(unlabeledMatchesQuerySuccessTotal);

        return result;
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            wideEvent.outcome = "error";
            wideEvent.error_tag = error._tag;
            wideEvent.error_message = error.message;
          }).pipe(
            Effect.andThen(Metric.increment(unlabeledMatchesQueryErrorTotal))
          )
        ),
        Effect.ensuring(
          Effect.suspend(() => {
            const durationMs = Date.now() - startTime;
            wideEvent.duration_ms = durationMs;
            wideEvent.outcome ??= "interrupted";
            const log =
              wideEvent.outcome === "error"
                ? Effect.logError("admin.getUnlabeledMatches")
                : Effect.logInfo("admin.getUnlabeledMatches");
            return log.pipe(
              Effect.annotateLogs(wideEvent),
              Effect.andThen(
                unlabeledMatchesQueryDuration(Effect.succeed(durationMs))
              )
            );
          })
        ),
        Effect.withSpan("admin.getUnlabeledMatches")
      );
    }

    function getMatchForLabeling(
      matchId: number
    ): Effect.Effect<
      MatchForLabeling,
      DataLabelingQueryError | MatchNotFoundError
    > {
      const startTime = Date.now();
      const wideEvent: Record<string, unknown> = { matchId };

      return Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan("matchId", matchId);
        const match = yield* Effect.tryPromise({
          try: () =>
            prisma.scoutingMatch.findUnique({
              where: { id: matchId },
              include: {
                maps: {
                  include: {
                    heroBans: {
                      select: {
                        id: true,
                        team: true,
                        hero: true,
                        banOrder: true,
                      },
                      orderBy: { banOrder: "asc" },
                    },
                    heroAssignments: {
                      select: {
                        heroName: true,
                        playerName: true,
                        team: true,
                      },
                    },
                  },
                  orderBy: { gameNumber: "asc" },
                },
                tournament: { select: { title: true, id: true } },
              },
            }),
          catch: (error) =>
            new DataLabelingQueryError({
              operation: `fetch match for labeling id=${matchId}`,
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("admin.matchForLabeling.fetchMatch", {
            attributes: { matchId },
          })
        );

        if (!match) {
          return yield* new MatchNotFoundError({ matchId });
        }

        wideEvent.team1 = match.team1;
        wideEvent.team2 = match.team2;
        wideEvent.mapCount = match.maps.length;

        const vods = match.vods as { url: string; platform: string }[];

        const [team1Roster, team2Roster] = yield* Effect.all(
          [
            getRosterPlayers(match.tournament.id, match.team1FullName),
            getRosterPlayers(match.tournament.id, match.team2FullName),
          ],
          { concurrency: 2 }
        ).pipe(
          Effect.withSpan("admin.matchForLabeling.fetchRosters", {
            attributes: {
              matchId,
              tournamentId: match.tournament.id,
              team1: match.team1FullName,
              team2: match.team2FullName,
            },
          })
        );

        wideEvent.team1RosterSize = team1Roster.length;
        wideEvent.team2RosterSize = team2Roster.length;
        wideEvent.outcome = "success";
        yield* Metric.increment(matchForLabelingQuerySuccessTotal);

        return {
          id: match.id,
          team1: match.team1,
          team1FullName: match.team1FullName,
          team2: match.team2,
          team2FullName: match.team2FullName,
          team1Score: match.team1Score,
          team2Score: match.team2Score,
          matchDate: match.matchDate,
          tournament: match.tournament.title,
          vods,
          team1Roster,
          team2Roster,
          maps: match.maps.map((map) => ({
            id: map.id,
            gameNumber: map.gameNumber,
            mapType: map.mapType,
            mapName: map.mapName,
            team1Score: map.team1Score,
            team2Score: map.team2Score,
            winner: map.winner,
            team1Comp: map.team1Comp,
            team2Comp: map.team2Comp,
            heroBans: map.heroBans,
            heroAssignments: map.heroAssignments,
          })),
        } satisfies MatchForLabeling;
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            wideEvent.outcome = "error";
            wideEvent.error_tag = error._tag;
            wideEvent.error_message = error.message;
          }).pipe(
            Effect.andThen(Metric.increment(matchForLabelingQueryErrorTotal))
          )
        ),
        Effect.ensuring(
          Effect.suspend(() => {
            const durationMs = Date.now() - startTime;
            wideEvent.duration_ms = durationMs;
            wideEvent.outcome ??= "interrupted";
            const log =
              wideEvent.outcome === "error"
                ? Effect.logError("admin.getMatchForLabeling")
                : Effect.logInfo("admin.getMatchForLabeling");
            return log.pipe(
              Effect.annotateLogs(wideEvent),
              Effect.andThen(
                matchForLabelingQueryDuration(Effect.succeed(durationMs))
              )
            );
          })
        ),
        Effect.withSpan("admin.getMatchForLabeling")
      );
    }

    const unlabeledMatchesCache = yield* Cache.make({
      capacity: 64,
      timeToLive: Duration.seconds(30),
      lookup: (key: string) => {
        const [pageStr, pageSizeStr] = key.split(":");
        return getUnlabeledMatches(Number(pageStr), Number(pageSizeStr)).pipe(
          Effect.tap(() => Metric.increment(adminCacheMissTotal))
        );
      },
    });

    const matchForLabelingCache = yield* Cache.make({
      capacity: 64,
      timeToLive: Duration.seconds(30),
      lookup: (matchId: number) =>
        getMatchForLabeling(matchId).pipe(
          Effect.tap(() => Metric.increment(adminCacheMissTotal))
        ),
    });

    return {
      getUnlabeledMatches: (page: number, pageSize: number) =>
        unlabeledMatchesCache
          .get(`${page}:${pageSize}`)
          .pipe(Effect.tap(() => Metric.increment(adminCacheRequestTotal))),
      getMatchForLabeling: (matchId: number) =>
        matchForLabelingCache
          .get(matchId)
          .pipe(Effect.tap(() => Metric.increment(adminCacheRequestTotal))),
    } satisfies DataLabelingServiceInterface;
  }
);

export const DataLabelingServiceLive = Layer.effect(
  DataLabelingService,
  make
).pipe(Layer.provide(EffectObservabilityLive));
