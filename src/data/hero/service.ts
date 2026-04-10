import { EffectObservabilityLive } from "@/instrumentation";
import prisma from "@/lib/prisma";
import { removeDuplicateRows } from "@/lib/utils";
import type { Kill, PlayerStat } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { Cache, Context, Duration, Effect, Layer, Metric } from "effect";
import { HeroQueryError } from "./errors";
import {
  heroDeathsQueryDuration,
  heroDeathsQueryErrorTotal,
  heroDeathsQuerySuccessTotal,
  heroKillsQueryDuration,
  heroKillsQueryErrorTotal,
  heroKillsQuerySuccessTotal,
  heroStatsQueryDuration,
  heroStatsQueryErrorTotal,
  heroStatsQuerySuccessTotal,
  heroCacheRequestTotal,
  heroCacheMissTotal,
} from "./metrics";

export type HeroServiceInterface = {
  readonly getAllStatsForHero: (
    scrimIds: number[],
    hero: string
  ) => Effect.Effect<PlayerStat[], HeroQueryError>;

  readonly getAllKillsForHero: (
    scrimIds: number[],
    hero: string
  ) => Effect.Effect<Kill[], HeroQueryError>;

  readonly getAllDeathsForHero: (
    scrimIds: number[],
    hero: string
  ) => Effect.Effect<Kill[], HeroQueryError>;
};

export class HeroService extends Context.Tag("@app/data/hero/HeroService")<
  HeroService,
  HeroServiceInterface
>() {}

export const make: Effect.Effect<HeroServiceInterface> = Effect.gen(
  function* () {
    function resolveMapDataIds(
      scrimIds: number[]
    ): Effect.Effect<number[], HeroQueryError> {
      return Effect.gen(function* () {
        const mapDataIds = yield* Effect.tryPromise({
          try: () =>
            prisma.scrim.findMany({
              where: { id: { in: scrimIds } },
              select: { maps: true },
            }),
          catch: (error) =>
            new HeroQueryError({
              operation: "fetch map data IDs from scrims",
              cause: error,
            }),
        });

        const mapDataIdSet = new Set<number>();
        mapDataIds.forEach((scrim) => {
          scrim.maps.forEach((map) => {
            mapDataIdSet.add(map.id);
          });
        });

        return Array.from(mapDataIdSet);
      });
    }

    function getAllStatsForHero(
      scrimIds: number[],
      hero: string
    ): Effect.Effect<PlayerStat[], HeroQueryError> {
      const startTime = Date.now();
      const wideEvent: Record<string, unknown> = {
        scrimIds,
        hero,
        scrimCount: scrimIds.length,
      };

      return Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan("hero", hero);
        yield* Effect.annotateCurrentSpan("scrimCount", scrimIds.length);
        const mapDataIdArray = yield* resolveMapDataIds(scrimIds).pipe(
          Effect.withSpan("hero.stats.resolveMapDataIds", {
            attributes: { scrimCount: scrimIds.length },
          })
        );

        wideEvent.mapDataIdCount = mapDataIdArray.length;

        if (mapDataIdArray.length === 0) {
          wideEvent.outcome = "success";
          wideEvent.resultCount = 0;
          yield* Metric.increment(heroStatsQuerySuccessTotal);
          const _empty: PlayerStat[] = []; return _empty;
        }

        const rows = yield* Effect.tryPromise({
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
                AND ps."player_hero" ILIKE ${hero}`,
          catch: (error) =>
            new HeroQueryError({
              operation: `fetch all stats for hero: ${hero}`,
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("hero.stats.queryRaw", {
            attributes: { hero, mapCount: mapDataIdArray.length },
          })
        );

        const result = removeDuplicateRows(rows);

        wideEvent.rawRowCount = rows.length;
        wideEvent.resultCount = result.length;
        wideEvent.outcome = "success";
        yield* Metric.increment(heroStatsQuerySuccessTotal);

        return result;
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            wideEvent.outcome = "error";
            wideEvent.error_tag = error._tag;
            wideEvent.error_message = error.message;
          }).pipe(Effect.andThen(Metric.increment(heroStatsQueryErrorTotal)))
        ),
        Effect.ensuring(
          Effect.suspend(() => {
            const durationMs = Date.now() - startTime;
            wideEvent.duration_ms = durationMs;
            wideEvent.outcome ??= "interrupted";
            const log =
              wideEvent.outcome === "error"
                ? Effect.logError("hero.getAllStatsForHero")
                : Effect.logInfo("hero.getAllStatsForHero");
            return log.pipe(
              Effect.annotateLogs(wideEvent),
              Effect.andThen(heroStatsQueryDuration(Effect.succeed(durationMs)))
            );
          })
        ),
        Effect.withSpan("hero.getAllStatsForHero")
      );
    }

    function getAllKillsForHero(
      scrimIds: number[],
      hero: string
    ): Effect.Effect<Kill[], HeroQueryError> {
      const startTime = Date.now();
      const wideEvent: Record<string, unknown> = {
        scrimIds,
        hero,
        scrimCount: scrimIds.length,
      };

      return Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan("hero", hero);
        yield* Effect.annotateCurrentSpan("scrimCount", scrimIds.length);
        const mapDataIdArray = yield* resolveMapDataIds(scrimIds).pipe(
          Effect.withSpan("hero.kills.resolveMapDataIds", {
            attributes: { scrimCount: scrimIds.length },
          })
        );

        wideEvent.mapDataIdCount = mapDataIdArray.length;

        if (mapDataIdArray.length === 0) {
          wideEvent.outcome = "success";
          wideEvent.resultCount = 0;
          yield* Metric.increment(heroKillsQuerySuccessTotal);
          const _empty: Kill[] = []; return _empty;
        }

        const kills = yield* Effect.tryPromise({
          try: () =>
            prisma.kill.findMany({
              where: {
                MapDataId: { in: mapDataIdArray },
                attacker_hero: { equals: hero, mode: "insensitive" },
              },
            }),
          catch: (error) =>
            new HeroQueryError({
              operation: `fetch all kills for hero: ${hero}`,
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("hero.kills.query", {
            attributes: { hero, mapCount: mapDataIdArray.length },
          })
        );

        wideEvent.resultCount = kills.length;
        wideEvent.outcome = "success";
        yield* Metric.increment(heroKillsQuerySuccessTotal);

        return kills;
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            wideEvent.outcome = "error";
            wideEvent.error_tag = error._tag;
            wideEvent.error_message = error.message;
          }).pipe(Effect.andThen(Metric.increment(heroKillsQueryErrorTotal)))
        ),
        Effect.ensuring(
          Effect.suspend(() => {
            const durationMs = Date.now() - startTime;
            wideEvent.duration_ms = durationMs;
            wideEvent.outcome ??= "interrupted";
            const log =
              wideEvent.outcome === "error"
                ? Effect.logError("hero.getAllKillsForHero")
                : Effect.logInfo("hero.getAllKillsForHero");
            return log.pipe(
              Effect.annotateLogs(wideEvent),
              Effect.andThen(heroKillsQueryDuration(Effect.succeed(durationMs)))
            );
          })
        ),
        Effect.withSpan("hero.getAllKillsForHero")
      );
    }

    function getAllDeathsForHero(
      scrimIds: number[],
      hero: string
    ): Effect.Effect<Kill[], HeroQueryError> {
      const startTime = Date.now();
      const wideEvent: Record<string, unknown> = {
        scrimIds,
        hero,
        scrimCount: scrimIds.length,
      };

      return Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan("hero", hero);
        yield* Effect.annotateCurrentSpan("scrimCount", scrimIds.length);
        const mapDataIdArray = yield* resolveMapDataIds(scrimIds).pipe(
          Effect.withSpan("hero.deaths.resolveMapDataIds", {
            attributes: { scrimCount: scrimIds.length },
          })
        );

        wideEvent.mapDataIdCount = mapDataIdArray.length;

        if (mapDataIdArray.length === 0) {
          wideEvent.outcome = "success";
          wideEvent.resultCount = 0;
          yield* Metric.increment(heroDeathsQuerySuccessTotal);
          const _empty: Kill[] = []; return _empty;
        }

        const deaths = yield* Effect.tryPromise({
          try: () =>
            prisma.kill.findMany({
              where: {
                MapDataId: { in: mapDataIdArray },
                victim_hero: { equals: hero, mode: "insensitive" },
              },
            }),
          catch: (error) =>
            new HeroQueryError({
              operation: `fetch all deaths for hero: ${hero}`,
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("hero.deaths.query", {
            attributes: { hero, mapCount: mapDataIdArray.length },
          })
        );

        wideEvent.resultCount = deaths.length;
        wideEvent.outcome = "success";
        yield* Metric.increment(heroDeathsQuerySuccessTotal);

        return deaths;
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            wideEvent.outcome = "error";
            wideEvent.error_tag = error._tag;
            wideEvent.error_message = error.message;
          }).pipe(Effect.andThen(Metric.increment(heroDeathsQueryErrorTotal)))
        ),
        Effect.ensuring(
          Effect.suspend(() => {
            const durationMs = Date.now() - startTime;
            wideEvent.duration_ms = durationMs;
            wideEvent.outcome ??= "interrupted";
            const log =
              wideEvent.outcome === "error"
                ? Effect.logError("hero.getAllDeathsForHero")
                : Effect.logInfo("hero.getAllDeathsForHero");
            return log.pipe(
              Effect.annotateLogs(wideEvent),
              Effect.andThen(
                heroDeathsQueryDuration(Effect.succeed(durationMs))
              )
            );
          })
        ),
        Effect.withSpan("hero.getAllDeathsForHero")
      );
    }

    function heroCacheKeyOf(scrimIds: number[], hero: string) {
      return `${JSON.stringify(scrimIds)}:${hero}`;
    }

    const statsCache = yield* Cache.make({
      capacity: 64,
      timeToLive: Duration.seconds(30),
      lookup: (key: string) => {
        const colonIdx = key.lastIndexOf(":");
        const scrimIds = JSON.parse(key.slice(0, colonIdx)) as number[];
        const hero = key.slice(colonIdx + 1);
        return getAllStatsForHero(scrimIds, hero).pipe(
          Effect.tap(() => Metric.increment(heroCacheMissTotal))
        );
      },
    });

    const killsCache = yield* Cache.make({
      capacity: 64,
      timeToLive: Duration.seconds(30),
      lookup: (key: string) => {
        const colonIdx = key.lastIndexOf(":");
        const scrimIds = JSON.parse(key.slice(0, colonIdx)) as number[];
        const hero = key.slice(colonIdx + 1);
        return getAllKillsForHero(scrimIds, hero).pipe(
          Effect.tap(() => Metric.increment(heroCacheMissTotal))
        );
      },
    });

    const deathsCache = yield* Cache.make({
      capacity: 64,
      timeToLive: Duration.seconds(30),
      lookup: (key: string) => {
        const colonIdx = key.lastIndexOf(":");
        const scrimIds = JSON.parse(key.slice(0, colonIdx)) as number[];
        const hero = key.slice(colonIdx + 1);
        return getAllDeathsForHero(scrimIds, hero).pipe(
          Effect.tap(() => Metric.increment(heroCacheMissTotal))
        );
      },
    });

    return {
      getAllStatsForHero: (scrimIds: number[], hero: string) =>
        statsCache
          .get(heroCacheKeyOf(scrimIds, hero))
          .pipe(Effect.tap(() => Metric.increment(heroCacheRequestTotal))),
      getAllKillsForHero: (scrimIds: number[], hero: string) =>
        killsCache
          .get(heroCacheKeyOf(scrimIds, hero))
          .pipe(Effect.tap(() => Metric.increment(heroCacheRequestTotal))),
      getAllDeathsForHero: (scrimIds: number[], hero: string) =>
        deathsCache
          .get(heroCacheKeyOf(scrimIds, hero))
          .pipe(Effect.tap(() => Metric.increment(heroCacheRequestTotal))),
    } satisfies HeroServiceInterface;
  }
);

export const HeroServiceLive = Layer.effect(HeroService, make).pipe(
  Layer.provide(EffectObservabilityLive)
);
