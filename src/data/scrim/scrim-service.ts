import {
  buildCapturesMaps,
  buildMatchStartMap,
  buildProgressMaps,
} from "@/data/team/shared-core";
import { EffectObservabilityLive } from "@/instrumentation";
import { resolveMapDataId } from "@/lib/map-data-resolver";
import prisma from "@/lib/prisma";
import { removeDuplicateRows } from "@/lib/utils";
import { calculateWinner } from "@/lib/winrate";
import { heroPriority, heroRoleMapping, type HeroName } from "@/types/heroes";
import {
  Prisma,
  type Kill,
  type PlayerStat,
  type RoundEnd,
  type Scrim,
} from "@prisma/client";
import { Cache, Context, Duration, Effect, Layer, Metric } from "effect";
import { ScrimQueryError } from "./errors";
import {
  scrimCacheMissTotal,
  scrimCacheRequestTotal,
  scrimGetAllDeathsForPlayerDuration,
  scrimGetAllDeathsForPlayerErrorTotal,
  scrimGetAllDeathsForPlayerSuccessTotal,
  scrimGetAllKillsForPlayerDuration,
  scrimGetAllKillsForPlayerErrorTotal,
  scrimGetAllKillsForPlayerSuccessTotal,
  scrimGetAllMapWinratesForPlayerDuration,
  scrimGetAllMapWinratesForPlayerErrorTotal,
  scrimGetAllMapWinratesForPlayerSuccessTotal,
  scrimGetAllStatsForPlayerDuration,
  scrimGetAllStatsForPlayerErrorTotal,
  scrimGetAllStatsForPlayerSuccessTotal,
  scrimGetFinalRoundStatsDuration,
  scrimGetFinalRoundStatsErrorTotal,
  scrimGetFinalRoundStatsForPlayerDuration,
  scrimGetFinalRoundStatsForPlayerErrorTotal,
  scrimGetFinalRoundStatsForPlayerSuccessTotal,
  scrimGetFinalRoundStatsSuccessTotal,
  scrimGetScrimDuration,
  scrimGetScrimErrorTotal,
  scrimGetScrimSuccessTotal,
  scrimGetUserViewableScrimsDuration,
  scrimGetUserViewableScrimsErrorTotal,
  scrimGetUserViewableScrimsSuccessTotal,
} from "./metrics";

export type Winrate = { map: string; wins: number; date: Date }[];

export type ScrimServiceInterface = {
  readonly getScrim: (
    id: number
  ) => Effect.Effect<Scrim | null, ScrimQueryError>;

  readonly getUserViewableScrims: (
    userId: string
  ) => Effect.Effect<Scrim[], ScrimQueryError>;

  readonly getFinalRoundStats: (
    mapId: number
  ) => Effect.Effect<PlayerStat[], ScrimQueryError>;

  readonly getFinalRoundStatsForPlayer: (
    mapId: number,
    playerName: string
  ) => Effect.Effect<PlayerStat[], ScrimQueryError>;

  readonly getAllStatsForPlayer: (
    scrimIds: number[],
    name: string
  ) => Effect.Effect<PlayerStat[], ScrimQueryError>;

  readonly getAllKillsForPlayer: (
    scrimIds: number[],
    name: string
  ) => Effect.Effect<Kill[], ScrimQueryError>;

  readonly getAllDeathsForPlayer: (
    scrimIds: number[],
    name: string
  ) => Effect.Effect<Kill[], ScrimQueryError>;

  readonly getAllMapWinratesForPlayer: (
    scrimIds: number[],
    name: string
  ) => Effect.Effect<Winrate, ScrimQueryError>;
};

export class ScrimService extends Context.Tag("@app/data/scrim/ScrimService")<
  ScrimService,
  ScrimServiceInterface
>() {}

const CACHE_TTL = Duration.seconds(30);
const CACHE_CAPACITY = 64;

export const make: Effect.Effect<ScrimServiceInterface> = Effect.gen(
  function* () {
    function getScrim(
      id: number
    ): Effect.Effect<Scrim | null, ScrimQueryError> {
      const startTime = Date.now();
      const wideEvent: Record<string, unknown> = { scrimId: id };

      return Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan("scrimId", id);
        const scrim = yield* Effect.tryPromise({
          try: () => prisma.scrim.findFirst({ where: { id } }),
          catch: (error) =>
            new ScrimQueryError({
              operation: "getScrim",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("scrim.getScrim.query", {
            attributes: { scrimId: id },
          })
        );

        wideEvent.found = scrim !== null;
        wideEvent.outcome = "success";
        yield* Metric.increment(scrimGetScrimSuccessTotal);
        return scrim;
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            wideEvent.outcome = "error";
            wideEvent.error_tag = error._tag;
            wideEvent.error_message = error.message;
          }).pipe(Effect.andThen(Metric.increment(scrimGetScrimErrorTotal)))
        ),
        Effect.ensuring(
          Effect.suspend(() => {
            const durationMs = Date.now() - startTime;
            wideEvent.duration_ms = durationMs;
            wideEvent.outcome ??= "interrupted";
            const log =
              wideEvent.outcome === "error"
                ? Effect.logError("scrim.getScrim")
                : Effect.logInfo("scrim.getScrim");
            return log.pipe(
              Effect.annotateLogs(wideEvent),
              Effect.andThen(scrimGetScrimDuration(Effect.succeed(durationMs)))
            );
          })
        ),
        Effect.withSpan("scrim.getScrim")
      );
    }

    function getUserViewableScrims(
      userId: string
    ): Effect.Effect<Scrim[], ScrimQueryError> {
      const startTime = Date.now();
      const wideEvent: Record<string, unknown> = { userId };

      return Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan("userId", userId);
        const scrims = yield* Effect.tryPromise({
          try: () =>
            prisma.scrim.findMany({
              where: {
                OR: [
                  { creatorId: userId },
                  { Team: { users: { some: { id: userId } } } },
                ],
              },
            }),
          catch: (error) =>
            new ScrimQueryError({
              operation: "getUserViewableScrims",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("scrim.getUserViewableScrims.query", {
            attributes: { userId },
          })
        );

        wideEvent.scrim_count = scrims.length;
        wideEvent.outcome = "success";
        yield* Metric.increment(scrimGetUserViewableScrimsSuccessTotal);
        return scrims;
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            wideEvent.outcome = "error";
            wideEvent.error_tag = error._tag;
            wideEvent.error_message = error.message;
          }).pipe(
            Effect.andThen(
              Metric.increment(scrimGetUserViewableScrimsErrorTotal)
            )
          )
        ),
        Effect.ensuring(
          Effect.suspend(() => {
            const durationMs = Date.now() - startTime;
            wideEvent.duration_ms = durationMs;
            wideEvent.outcome ??= "interrupted";
            const log =
              wideEvent.outcome === "error"
                ? Effect.logError("scrim.getUserViewableScrims")
                : Effect.logInfo("scrim.getUserViewableScrims");
            return log.pipe(
              Effect.annotateLogs(wideEvent),
              Effect.andThen(
                scrimGetUserViewableScrimsDuration(Effect.succeed(durationMs))
              )
            );
          })
        ),
        Effect.withSpan("scrim.getUserViewableScrims")
      );
    }

    function getFinalRoundStats(
      mapId: number
    ): Effect.Effect<PlayerStat[], ScrimQueryError> {
      const startTime = Date.now();
      const wideEvent: Record<string, unknown> = { mapId };

      return Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan("mapId", mapId);
        const mapDataId = yield* Effect.tryPromise({
          try: () => resolveMapDataId(mapId),
          catch: (error) =>
            new ScrimQueryError({
              operation: "getFinalRoundStats.resolveMapDataId",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("scrim.getFinalRoundStats.resolveMapDataId", {
            attributes: { mapId },
          })
        );

        wideEvent.mapDataId = mapDataId;

        const rawStats = yield* Effect.tryPromise({
          try: () =>
            prisma.$queryRaw<PlayerStat[]>`
            WITH maxTime AS (
              SELECT
                  MAX("match_time") AS max_time
              FROM
                  "PlayerStat"
              WHERE
                  "MapDataId" = ${mapDataId}
            )
            SELECT
                ps.*
            FROM
                "PlayerStat" ps
                INNER JOIN maxTime m ON ps."match_time" = m.max_time
            WHERE
                ps."MapDataId" = ${mapDataId}`,
          catch: (error) =>
            new ScrimQueryError({
              operation: "getFinalRoundStats.query",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("scrim.getFinalRoundStats.query", {
            attributes: { mapId, mapDataId },
          })
        );

        const stats = removeDuplicateRows(rawStats)
          .sort((a, b) => a.player_name.localeCompare(b.player_name))
          .sort(
            (a, b) =>
              heroPriority[heroRoleMapping[a.player_hero as HeroName]] -
              heroPriority[heroRoleMapping[b.player_hero as HeroName]]
          )
          .sort((a, b) => a.player_team.localeCompare(b.player_team));

        wideEvent.stat_count = stats.length;
        wideEvent.outcome = "success";
        yield* Metric.increment(scrimGetFinalRoundStatsSuccessTotal);
        return stats;
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            wideEvent.outcome = "error";
            wideEvent.error_tag = error._tag;
            wideEvent.error_message = error.message;
          }).pipe(
            Effect.andThen(Metric.increment(scrimGetFinalRoundStatsErrorTotal))
          )
        ),
        Effect.ensuring(
          Effect.suspend(() => {
            const durationMs = Date.now() - startTime;
            wideEvent.duration_ms = durationMs;
            wideEvent.outcome ??= "interrupted";
            const log =
              wideEvent.outcome === "error"
                ? Effect.logError("scrim.getFinalRoundStats")
                : Effect.logInfo("scrim.getFinalRoundStats");
            return log.pipe(
              Effect.annotateLogs(wideEvent),
              Effect.andThen(
                scrimGetFinalRoundStatsDuration(Effect.succeed(durationMs))
              )
            );
          })
        ),
        Effect.withSpan("scrim.getFinalRoundStats")
      );
    }

    function getFinalRoundStatsForPlayer(
      mapId: number,
      playerName: string
    ): Effect.Effect<PlayerStat[], ScrimQueryError> {
      const startTime = Date.now();
      const wideEvent: Record<string, unknown> = { mapId, playerName };

      return Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan("mapId", mapId);
        yield* Effect.annotateCurrentSpan("playerName", playerName);
        const mapDataId = yield* Effect.tryPromise({
          try: () => resolveMapDataId(mapId),
          catch: (error) =>
            new ScrimQueryError({
              operation: "getFinalRoundStatsForPlayer.resolveMapDataId",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan(
            "scrim.getFinalRoundStatsForPlayer.resolveMapDataId",
            { attributes: { mapId } }
          )
        );

        wideEvent.mapDataId = mapDataId;

        const rawStats = yield* Effect.tryPromise({
          try: () =>
            prisma.$queryRaw<PlayerStat[]>`
            WITH maxTime AS (
              SELECT
                  MAX("match_time") AS max_time
              FROM
                  "PlayerStat"
              WHERE
                  "MapDataId" = ${mapDataId}
            )
            SELECT
                ps.*
            FROM
                "PlayerStat" ps
                INNER JOIN maxTime m ON ps."match_time" = m.max_time
            WHERE
                ps."MapDataId" = ${mapDataId}
                AND ps."player_name" = ${playerName}`,
          catch: (error) =>
            new ScrimQueryError({
              operation: "getFinalRoundStatsForPlayer.query",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("scrim.getFinalRoundStatsForPlayer.query", {
            attributes: { mapId, mapDataId, playerName },
          })
        );

        const stats = removeDuplicateRows(rawStats);

        wideEvent.stat_count = stats.length;
        wideEvent.outcome = "success";
        yield* Metric.increment(scrimGetFinalRoundStatsForPlayerSuccessTotal);
        return stats;
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            wideEvent.outcome = "error";
            wideEvent.error_tag = error._tag;
            wideEvent.error_message = error.message;
          }).pipe(
            Effect.andThen(
              Metric.increment(scrimGetFinalRoundStatsForPlayerErrorTotal)
            )
          )
        ),
        Effect.ensuring(
          Effect.suspend(() => {
            const durationMs = Date.now() - startTime;
            wideEvent.duration_ms = durationMs;
            wideEvent.outcome ??= "interrupted";
            const log =
              wideEvent.outcome === "error"
                ? Effect.logError("scrim.getFinalRoundStatsForPlayer")
                : Effect.logInfo("scrim.getFinalRoundStatsForPlayer");
            return log.pipe(
              Effect.annotateLogs(wideEvent),
              Effect.andThen(
                scrimGetFinalRoundStatsForPlayerDuration(
                  Effect.succeed(durationMs)
                )
              )
            );
          })
        ),
        Effect.withSpan("scrim.getFinalRoundStatsForPlayer")
      );
    }

    function getAllStatsForPlayer(
      scrimIds: number[],
      name: string
    ): Effect.Effect<PlayerStat[], ScrimQueryError> {
      const startTime = Date.now();
      const wideEvent: Record<string, unknown> = {
        scrimIds,
        name,
        scrimIdCount: scrimIds.length,
      };

      return Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan("scrimIdCount", scrimIds.length);
        yield* Effect.annotateCurrentSpan("name", name);

        if (scrimIds.length === 0) {
          wideEvent.outcome = "success";
          wideEvent.stat_count = 0;
          yield* Metric.increment(scrimGetAllStatsForPlayerSuccessTotal);
          const _empty: PlayerStat[] = []; return _empty;
        }

        const scrims = yield* Effect.tryPromise({
          try: () =>
            prisma.scrim.findMany({
              where: { id: { in: scrimIds } },
              select: {
                maps: { select: { mapData: { select: { id: true } } } },
              },
            }),
          catch: (error) =>
            new ScrimQueryError({
              operation: "getAllStatsForPlayer.findScrims",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("scrim.getAllStatsForPlayer.findScrims", {
            attributes: { scrimIdCount: scrimIds.length },
          })
        );

        const mapDataIdSet = new Set<number>();
        scrims.forEach((scrim) => {
          scrim.maps.forEach((map) => {
            map.mapData.forEach((md) => mapDataIdSet.add(md.id));
          });
        });
        const mapDataIdArray = Array.from(mapDataIdSet);
        wideEvent.mapDataIdCount = mapDataIdArray.length;

        if (mapDataIdArray.length === 0) {
          wideEvent.outcome = "success";
          wideEvent.stat_count = 0;
          yield* Metric.increment(scrimGetAllStatsForPlayerSuccessTotal);
          const _empty: PlayerStat[] = []; return _empty;
        }

        const rawStats = yield* Effect.tryPromise({
          try: () =>
            prisma.$queryRaw<PlayerStat[]>`
            WITH maxTime AS (
              SELECT
                  MAX("match_time") AS max_time,
                  "MapDataId"
              FROM
                  "PlayerStat"
              WHERE
                  "MapDataId" IN (${Prisma.join(mapDataIdArray)})
              GROUP BY
                  "MapDataId"
            )
            SELECT
                ps.*
            FROM
                "PlayerStat" ps
                INNER JOIN maxTime m ON ps."match_time" = m.max_time AND ps."MapDataId" = m."MapDataId"
            WHERE
                ps."MapDataId" IN (${Prisma.join(mapDataIdArray)})
                AND ps."player_name" ILIKE ${name}`,
          catch: (error) =>
            new ScrimQueryError({
              operation: "getAllStatsForPlayer.query",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("scrim.getAllStatsForPlayer.query", {
            attributes: { mapDataIdCount: mapDataIdArray.length, name },
          })
        );

        const stats = removeDuplicateRows(rawStats);

        wideEvent.stat_count = stats.length;
        wideEvent.outcome = "success";
        yield* Metric.increment(scrimGetAllStatsForPlayerSuccessTotal);
        return stats;
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            wideEvent.outcome = "error";
            wideEvent.error_tag = error._tag;
            wideEvent.error_message = error.message;
          }).pipe(
            Effect.andThen(
              Metric.increment(scrimGetAllStatsForPlayerErrorTotal)
            )
          )
        ),
        Effect.ensuring(
          Effect.suspend(() => {
            const durationMs = Date.now() - startTime;
            wideEvent.duration_ms = durationMs;
            wideEvent.outcome ??= "interrupted";
            const log =
              wideEvent.outcome === "error"
                ? Effect.logError("scrim.getAllStatsForPlayer")
                : Effect.logInfo("scrim.getAllStatsForPlayer");
            return log.pipe(
              Effect.annotateLogs(wideEvent),
              Effect.andThen(
                scrimGetAllStatsForPlayerDuration(Effect.succeed(durationMs))
              )
            );
          })
        ),
        Effect.withSpan("scrim.getAllStatsForPlayer")
      );
    }

    function getAllKillsForPlayer(
      scrimIds: number[],
      name: string
    ): Effect.Effect<Kill[], ScrimQueryError> {
      const startTime = Date.now();
      const wideEvent: Record<string, unknown> = {
        scrimIds,
        name,
        scrimIdCount: scrimIds.length,
      };

      return Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan("scrimIdCount", scrimIds.length);
        yield* Effect.annotateCurrentSpan("name", name);

        const scrims = yield* Effect.tryPromise({
          try: () =>
            prisma.scrim.findMany({
              where: { id: { in: scrimIds } },
              select: {
                maps: { select: { mapData: { select: { id: true } } } },
              },
            }),
          catch: (error) =>
            new ScrimQueryError({
              operation: "getAllKillsForPlayer.findScrims",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("scrim.getAllKillsForPlayer.findScrims", {
            attributes: { scrimIdCount: scrimIds.length },
          })
        );

        const mapDataIdSet = new Set<number>();
        scrims.forEach((scrim) => {
          scrim.maps.forEach((map) => {
            map.mapData.forEach((md) => mapDataIdSet.add(md.id));
          });
        });
        const mapDataIdArray = Array.from(mapDataIdSet);
        wideEvent.mapDataIdCount = mapDataIdArray.length;

        const kills = yield* Effect.tryPromise({
          try: () =>
            prisma.kill.findMany({
              where: {
                MapDataId: { in: mapDataIdArray },
                attacker_name: { equals: name, mode: "insensitive" },
              },
            }),
          catch: (error) =>
            new ScrimQueryError({
              operation: "getAllKillsForPlayer.query",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("scrim.getAllKillsForPlayer.query", {
            attributes: { mapDataIdCount: mapDataIdArray.length, name },
          })
        );

        wideEvent.kill_count = kills.length;
        wideEvent.outcome = "success";
        yield* Metric.increment(scrimGetAllKillsForPlayerSuccessTotal);
        return kills;
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            wideEvent.outcome = "error";
            wideEvent.error_tag = error._tag;
            wideEvent.error_message = error.message;
          }).pipe(
            Effect.andThen(
              Metric.increment(scrimGetAllKillsForPlayerErrorTotal)
            )
          )
        ),
        Effect.ensuring(
          Effect.suspend(() => {
            const durationMs = Date.now() - startTime;
            wideEvent.duration_ms = durationMs;
            wideEvent.outcome ??= "interrupted";
            const log =
              wideEvent.outcome === "error"
                ? Effect.logError("scrim.getAllKillsForPlayer")
                : Effect.logInfo("scrim.getAllKillsForPlayer");
            return log.pipe(
              Effect.annotateLogs(wideEvent),
              Effect.andThen(
                scrimGetAllKillsForPlayerDuration(Effect.succeed(durationMs))
              )
            );
          })
        ),
        Effect.withSpan("scrim.getAllKillsForPlayer")
      );
    }

    function getAllDeathsForPlayer(
      scrimIds: number[],
      name: string
    ): Effect.Effect<Kill[], ScrimQueryError> {
      const startTime = Date.now();
      const wideEvent: Record<string, unknown> = {
        scrimIds,
        name,
        scrimIdCount: scrimIds.length,
      };

      return Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan("scrimIdCount", scrimIds.length);
        yield* Effect.annotateCurrentSpan("name", name);

        const scrims = yield* Effect.tryPromise({
          try: () =>
            prisma.scrim.findMany({
              where: { id: { in: scrimIds } },
              select: {
                maps: { select: { mapData: { select: { id: true } } } },
              },
            }),
          catch: (error) =>
            new ScrimQueryError({
              operation: "getAllDeathsForPlayer.findScrims",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("scrim.getAllDeathsForPlayer.findScrims", {
            attributes: { scrimIdCount: scrimIds.length },
          })
        );

        const mapDataIdSet = new Set<number>();
        scrims.forEach((scrim) => {
          scrim.maps.forEach((map) => {
            map.mapData.forEach((md) => mapDataIdSet.add(md.id));
          });
        });
        const mapDataIdArray = Array.from(mapDataIdSet);
        wideEvent.mapDataIdCount = mapDataIdArray.length;

        const deaths = yield* Effect.tryPromise({
          try: () =>
            prisma.kill.findMany({
              where: {
                MapDataId: { in: mapDataIdArray },
                victim_name: { equals: name, mode: "insensitive" },
              },
            }),
          catch: (error) =>
            new ScrimQueryError({
              operation: "getAllDeathsForPlayer.query",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("scrim.getAllDeathsForPlayer.query", {
            attributes: { mapDataIdCount: mapDataIdArray.length, name },
          })
        );

        wideEvent.death_count = deaths.length;
        wideEvent.outcome = "success";
        yield* Metric.increment(scrimGetAllDeathsForPlayerSuccessTotal);
        return deaths;
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            wideEvent.outcome = "error";
            wideEvent.error_tag = error._tag;
            wideEvent.error_message = error.message;
          }).pipe(
            Effect.andThen(
              Metric.increment(scrimGetAllDeathsForPlayerErrorTotal)
            )
          )
        ),
        Effect.ensuring(
          Effect.suspend(() => {
            const durationMs = Date.now() - startTime;
            wideEvent.duration_ms = durationMs;
            wideEvent.outcome ??= "interrupted";
            const log =
              wideEvent.outcome === "error"
                ? Effect.logError("scrim.getAllDeathsForPlayer")
                : Effect.logInfo("scrim.getAllDeathsForPlayer");
            return log.pipe(
              Effect.annotateLogs(wideEvent),
              Effect.andThen(
                scrimGetAllDeathsForPlayerDuration(Effect.succeed(durationMs))
              )
            );
          })
        ),
        Effect.withSpan("scrim.getAllDeathsForPlayer")
      );
    }

    function getAllMapWinratesForPlayer(
      scrimIds: number[],
      name: string
    ): Effect.Effect<Winrate, ScrimQueryError> {
      const startTime = Date.now();
      const wideEvent: Record<string, unknown> = {
        scrimIds,
        name,
        scrimIdCount: scrimIds.length,
      };

      return Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan("scrimIdCount", scrimIds.length);
        yield* Effect.annotateCurrentSpan("name", name);

        const scrims = yield* Effect.tryPromise({
          try: () =>
            prisma.scrim.findMany({
              where: { id: { in: scrimIds } },
              select: {
                maps: { select: { mapData: { select: { id: true } } } },
                date: true,
                id: true,
              },
            }),
          catch: (error) =>
            new ScrimQueryError({
              operation: "getAllMapWinratesForPlayer.findScrims",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("scrim.getAllMapWinratesForPlayer.findScrims", {
            attributes: { scrimIdCount: scrimIds.length },
          })
        );

        const mapDataIdSet = new Set<number>();
        const mapIdToDateMap = new Map<number, Date>();
        scrims.forEach((scrim) => {
          scrim.maps.forEach((map) => {
            map.mapData.forEach((md) => {
              mapDataIdSet.add(md.id);
              mapIdToDateMap.set(md.id, scrim.date);
            });
          });
        });
        const mapDataIdArray = Array.from(mapDataIdSet);
        wideEvent.mapDataIdCount = mapDataIdArray.length;

        if (mapDataIdArray.length === 0) {
          wideEvent.outcome = "success";
          wideEvent.win_count = 0;
          yield* Metric.increment(scrimGetAllMapWinratesForPlayerSuccessTotal);
          const _empty: Winrate = []; return _empty;
        }

        const [
          matchStarts,
          allFinalRounds,
          captures,
          payloadProgresses,
          pointProgresses,
          playerStats,
        ] = yield* Effect.tryPromise({
          try: () =>
            Promise.all([
              prisma.matchStart.findMany({
                where: { MapDataId: { in: mapDataIdArray } },
              }),
              prisma.roundEnd.findMany({
                where: { MapDataId: { in: mapDataIdArray } },
              }),
              prisma.objectiveCaptured.findMany({
                where: { MapDataId: { in: mapDataIdArray } },
                orderBy: [{ round_number: "asc" }, { match_time: "asc" }],
              }),
              prisma.payloadProgress.findMany({
                where: { MapDataId: { in: mapDataIdArray } },
                orderBy: [
                  { round_number: "asc" },
                  { objective_index: "asc" },
                  { match_time: "asc" },
                ],
              }),
              prisma.pointProgress.findMany({
                where: { MapDataId: { in: mapDataIdArray } },
                orderBy: [
                  { round_number: "asc" },
                  { objective_index: "asc" },
                  { match_time: "asc" },
                ],
              }),
              prisma.playerStat.findMany({
                where: {
                  player_name: { equals: name, mode: "insensitive" },
                  MapDataId: { in: mapDataIdArray },
                },
              }),
            ]),
          catch: (error) =>
            new ScrimQueryError({
              operation: "getAllMapWinratesForPlayer.parallelQueries",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("scrim.getAllMapWinratesForPlayer.parallelQueries", {
            attributes: { mapDataIdCount: mapDataIdArray.length, name },
          })
        );

        const finalRounds = allFinalRounds.reduce(
          (acc, round) => {
            if (
              !acc[round.MapDataId!] ||
              acc[round.MapDataId!].match_time < round.match_time
            ) {
              acc[round.MapDataId!] = round;
            }
            return acc;
          },
          {} as Record<number, RoundEnd>
        );

        const matchStartMap = buildMatchStartMap(matchStarts);
        const { team1CapturesMap, team2CapturesMap } = buildCapturesMaps(
          captures,
          matchStartMap
        );
        const {
          team1ProgressMap: team1PayloadProgressMap,
          team2ProgressMap: team2PayloadProgressMap,
        } = buildProgressMaps(payloadProgresses, matchStartMap);
        const {
          team1ProgressMap: team1PointProgressMap,
          team2ProgressMap: team2PointProgressMap,
        } = buildProgressMaps(pointProgresses, matchStartMap);

        const wins: Winrate = [];

        for (const mapId of mapDataIdArray) {
          const playerStat = playerStats.find(
            (stat) => stat.MapDataId === mapId
          );
          if (!playerStat) continue;

          const matchDetails = matchStarts.find(
            (match) => match.MapDataId === mapId
          );
          if (!matchDetails) continue;

          const winner = calculateWinner({
            matchDetails,
            finalRound: finalRounds[mapId],
            team1Captures: team1CapturesMap.get(mapId) ?? [],
            team2Captures: team2CapturesMap.get(mapId) ?? [],
            team1PayloadProgress: team1PayloadProgressMap.get(mapId) ?? [],
            team2PayloadProgress: team2PayloadProgressMap.get(mapId) ?? [],
            team1PointProgress: team1PointProgressMap.get(mapId) ?? [],
            team2PointProgress: team2PointProgressMap.get(mapId) ?? [],
          });

          const playerTeam = playerStat?.player_team;

          wins.push({
            map: matchDetails.map_name,
            wins: winner === playerTeam ? 1 : 0,
            date: mapIdToDateMap.get(mapId) ?? new Date(),
          });
        }

        wideEvent.win_count = wins.length;
        wideEvent.outcome = "success";
        yield* Metric.increment(scrimGetAllMapWinratesForPlayerSuccessTotal);
        return wins;
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            wideEvent.outcome = "error";
            wideEvent.error_tag = error._tag;
            wideEvent.error_message = error.message;
          }).pipe(
            Effect.andThen(
              Metric.increment(scrimGetAllMapWinratesForPlayerErrorTotal)
            )
          )
        ),
        Effect.ensuring(
          Effect.suspend(() => {
            const durationMs = Date.now() - startTime;
            wideEvent.duration_ms = durationMs;
            wideEvent.outcome ??= "interrupted";
            const log =
              wideEvent.outcome === "error"
                ? Effect.logError("scrim.getAllMapWinratesForPlayer")
                : Effect.logInfo("scrim.getAllMapWinratesForPlayer");
            return log.pipe(
              Effect.annotateLogs(wideEvent),
              Effect.andThen(
                scrimGetAllMapWinratesForPlayerDuration(
                  Effect.succeed(durationMs)
                )
              )
            );
          })
        ),
        Effect.withSpan("scrim.getAllMapWinratesForPlayer")
      );
    }

    const scrimCache = yield* Cache.make({
      capacity: CACHE_CAPACITY,
      timeToLive: CACHE_TTL,
      lookup: (id: number) =>
        getScrim(id).pipe(
          Effect.tap(() => Metric.increment(scrimCacheMissTotal))
        ),
    });

    const userViewableScrimsCache = yield* Cache.make({
      capacity: CACHE_CAPACITY,
      timeToLive: CACHE_TTL,
      lookup: (userId: string) =>
        getUserViewableScrims(userId).pipe(
          Effect.tap(() => Metric.increment(scrimCacheMissTotal))
        ),
    });

    const finalRoundStatsCache = yield* Cache.make({
      capacity: CACHE_CAPACITY,
      timeToLive: CACHE_TTL,
      lookup: (mapId: number) =>
        getFinalRoundStats(mapId).pipe(
          Effect.tap(() => Metric.increment(scrimCacheMissTotal))
        ),
    });

    function finalRoundStatsForPlayerCacheKeyOf(
      mapId: number,
      playerName: string
    ) { return JSON.stringify({ mapId, playerName }); }

    const finalRoundStatsForPlayerCache = yield* Cache.make({
      capacity: CACHE_CAPACITY,
      timeToLive: CACHE_TTL,
      lookup: (key: string) => {
        const { mapId, playerName } = JSON.parse(key) as {
          mapId: number;
          playerName: string;
        };
        return getFinalRoundStatsForPlayer(mapId, playerName).pipe(
          Effect.tap(() => Metric.increment(scrimCacheMissTotal))
        );
      },
    });

    function allStatsForPlayerCacheKeyOf(scrimIds: number[], name: string) { return JSON.stringify({ scrimIds, name }); }

    const allStatsForPlayerCache = yield* Cache.make({
      capacity: CACHE_CAPACITY,
      timeToLive: CACHE_TTL,
      lookup: (key: string) => {
        const { scrimIds, name } = JSON.parse(key) as {
          scrimIds: number[];
          name: string;
        };
        return getAllStatsForPlayer(scrimIds, name).pipe(
          Effect.tap(() => Metric.increment(scrimCacheMissTotal))
        );
      },
    });

    function allKillsForPlayerCacheKeyOf(scrimIds: number[], name: string) { return JSON.stringify({ scrimIds, name }); }

    const allKillsForPlayerCache = yield* Cache.make({
      capacity: CACHE_CAPACITY,
      timeToLive: CACHE_TTL,
      lookup: (key: string) => {
        const { scrimIds, name } = JSON.parse(key) as {
          scrimIds: number[];
          name: string;
        };
        return getAllKillsForPlayer(scrimIds, name).pipe(
          Effect.tap(() => Metric.increment(scrimCacheMissTotal))
        );
      },
    });

    function allDeathsForPlayerCacheKeyOf(scrimIds: number[], name: string) { return JSON.stringify({ scrimIds, name }); }

    const allDeathsForPlayerCache = yield* Cache.make({
      capacity: CACHE_CAPACITY,
      timeToLive: CACHE_TTL,
      lookup: (key: string) => {
        const { scrimIds, name } = JSON.parse(key) as {
          scrimIds: number[];
          name: string;
        };
        return getAllDeathsForPlayer(scrimIds, name).pipe(
          Effect.tap(() => Metric.increment(scrimCacheMissTotal))
        );
      },
    });

    function allMapWinratesForPlayerCacheKeyOf(
      scrimIds: number[],
      name: string
    ) { return JSON.stringify({ scrimIds, name }); }

    const allMapWinratesForPlayerCache = yield* Cache.make({
      capacity: CACHE_CAPACITY,
      timeToLive: CACHE_TTL,
      lookup: (key: string) => {
        const { scrimIds, name } = JSON.parse(key) as {
          scrimIds: number[];
          name: string;
        };
        return getAllMapWinratesForPlayer(scrimIds, name).pipe(
          Effect.tap(() => Metric.increment(scrimCacheMissTotal))
        );
      },
    });

    return {
      getScrim: (id: number) =>
        scrimCache
          .get(id)
          .pipe(Effect.tap(() => Metric.increment(scrimCacheRequestTotal))),
      getUserViewableScrims: (userId: string) =>
        userViewableScrimsCache
          .get(userId)
          .pipe(Effect.tap(() => Metric.increment(scrimCacheRequestTotal))),
      getFinalRoundStats: (mapId: number) =>
        finalRoundStatsCache
          .get(mapId)
          .pipe(Effect.tap(() => Metric.increment(scrimCacheRequestTotal))),
      getFinalRoundStatsForPlayer: (mapId: number, playerName: string) =>
        finalRoundStatsForPlayerCache
          .get(finalRoundStatsForPlayerCacheKeyOf(mapId, playerName))
          .pipe(Effect.tap(() => Metric.increment(scrimCacheRequestTotal))),
      getAllStatsForPlayer: (scrimIds: number[], name: string) =>
        allStatsForPlayerCache
          .get(allStatsForPlayerCacheKeyOf(scrimIds, name))
          .pipe(Effect.tap(() => Metric.increment(scrimCacheRequestTotal))),
      getAllKillsForPlayer: (scrimIds: number[], name: string) =>
        allKillsForPlayerCache
          .get(allKillsForPlayerCacheKeyOf(scrimIds, name))
          .pipe(Effect.tap(() => Metric.increment(scrimCacheRequestTotal))),
      getAllDeathsForPlayer: (scrimIds: number[], name: string) =>
        allDeathsForPlayerCache
          .get(allDeathsForPlayerCacheKeyOf(scrimIds, name))
          .pipe(Effect.tap(() => Metric.increment(scrimCacheRequestTotal))),
      getAllMapWinratesForPlayer: (scrimIds: number[], name: string) =>
        allMapWinratesForPlayerCache
          .get(allMapWinratesForPlayerCacheKeyOf(scrimIds, name))
          .pipe(Effect.tap(() => Metric.increment(scrimCacheRequestTotal))),
    } satisfies ScrimServiceInterface;
  }
);

export const ScrimServiceLive = Layer.effect(ScrimService, make).pipe(
  Layer.provide(EffectObservabilityLive)
);
