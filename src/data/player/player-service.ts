import { EffectObservabilityLive } from "@/instrumentation";
import { resolveMapDataId } from "@/lib/map-data-resolver";
import prisma from "@/lib/prisma";
import { Cache, Context, Duration, Effect, Layer, Metric } from "effect";
import { PlayerQueryError } from "./errors";
import {
  playerCacheRequestTotal,
  playerCacheMissTotal,
  playerMostPlayedQueryDuration,
  playerMostPlayedQueryErrorTotal,
  playerMostPlayedQuerySuccessTotal,
} from "./metrics";
import type { MostPlayedHeroRow } from "./types";

export type PlayerServiceInterface = {
  readonly getMostPlayedHeroes: (
    mapId: number
  ) => Effect.Effect<MostPlayedHeroRow[], PlayerQueryError>;
};

export class PlayerService extends Context.Tag(
  "@app/data/player/PlayerService"
)<PlayerService, PlayerServiceInterface>() {}

const CACHE_TTL = Duration.seconds(30);
const CACHE_CAPACITY = 64;

export const make: Effect.Effect<PlayerServiceInterface> = Effect.gen(
  function* () {
    function getMostPlayedHeroes(
      mapId: number
    ): Effect.Effect<MostPlayedHeroRow[], PlayerQueryError> {
      const startTime = Date.now();
      const wideEvent: Record<string, unknown> = { mapId };

      return Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan("mapId", mapId);
        const mapDataId = yield* Effect.tryPromise({
          try: () => resolveMapDataId(mapId),
          catch: (error) =>
            new PlayerQueryError({
              operation: "resolve map data id",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("player.mostPlayed.resolveMapDataId", {
            attributes: { mapId },
          })
        );

        wideEvent.mapDataId = mapDataId;

        const rows = yield* Effect.tryPromise({
          try: () =>
            prisma.playerStat.findMany({
              where: { MapDataId: mapDataId },
              select: {
                player_name: true,
                player_team: true,
                player_hero: true,
                hero_time_played: true,
              },
              orderBy: { hero_time_played: "desc" },
              distinct: ["player_name"],
            }),
          catch: (error) =>
            new PlayerQueryError({
              operation: "fetch most played heroes",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("player.mostPlayed.fetchPlayerStats", {
            attributes: { mapId, mapDataId },
          })
        );

        wideEvent.row_count = rows.length;
        wideEvent.outcome = "success";
        yield* Metric.increment(playerMostPlayedQuerySuccessTotal);
        return rows;
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            wideEvent.outcome = "error";
            wideEvent.error_tag = error._tag;
            wideEvent.error_message = error.message;
          }).pipe(
            Effect.andThen(Metric.increment(playerMostPlayedQueryErrorTotal))
          )
        ),
        Effect.ensuring(
          Effect.suspend(() => {
            const durationMs = Date.now() - startTime;
            wideEvent.duration_ms = durationMs;
            wideEvent.outcome ??= "interrupted";
            const log =
              wideEvent.outcome === "error"
                ? Effect.logError("player.getMostPlayedHeroes")
                : Effect.logInfo("player.getMostPlayedHeroes");
            return log.pipe(
              Effect.annotateLogs(wideEvent),
              Effect.andThen(
                playerMostPlayedQueryDuration(Effect.succeed(durationMs))
              )
            );
          })
        ),
        Effect.withSpan("player.getMostPlayedHeroes")
      );
    }

    const mostPlayedCache = yield* Cache.make({
      capacity: CACHE_CAPACITY,
      timeToLive: CACHE_TTL,
      lookup: (mapId: number) =>
        getMostPlayedHeroes(mapId).pipe(
          Effect.tap(() => Metric.increment(playerCacheMissTotal))
        ),
    });

    return {
      getMostPlayedHeroes: (mapId: number) =>
        mostPlayedCache
          .get(mapId)
          .pipe(Effect.tap(() => Metric.increment(playerCacheRequestTotal))),
    } satisfies PlayerServiceInterface;
  }
);

export const PlayerServiceLive = Layer.effect(PlayerService, make).pipe(
  Layer.provide(EffectObservabilityLive)
);
