import { EffectObservabilityLive } from "@/instrumentation";
import { resolveMapDataId } from "@/lib/map-data-resolver";
import prisma from "@/lib/prisma";
import {
  countEventsByZone,
  type ZoneCountEvent,
  type ZoneCountRow,
} from "@/lib/zones/analytics";
import { loadZoneContext } from "@/lib/ult-quality-db";
import { Cache, Context, Duration, Effect, Layer, Metric } from "effect";
import { MapQueryError } from "./errors";
import {
  mapCacheMissTotal,
  mapCacheRequestTotal,
  zoneAnalyticsQueryDuration,
  zoneAnalyticsQueryErrorTotal,
  zoneAnalyticsQuerySuccessTotal,
} from "./metrics";

export async function buildZoneAnalyticsForMapData(
  mapDataId: number
): Promise<{ rows: ZoneCountRow[] } | null> {
  const ctx = await loadZoneContext(mapDataId);

  const [kills, ults] = await Promise.all([
    prisma.kill.findMany({
      where: { MapDataId: mapDataId },
      select: {
        match_time: true,
        attacker_team: true,
        victim_team: true,
        attacker_x: true,
        attacker_z: true,
        victim_x: true,
        victim_z: true,
      },
    }),
    prisma.ultimateStart.findMany({
      where: { MapDataId: mapDataId },
      select: {
        match_time: true,
        player_team: true,
        player_x: true,
        player_z: true,
      },
    }),
  ]);

  const events: ZoneCountEvent[] = [];
  for (const k of kills) {
    events.push({
      t: k.match_time,
      x: k.attacker_x,
      z: k.attacker_z,
      team: k.attacker_team,
      kind: "kill",
    });
    events.push({
      t: k.match_time,
      x: k.victim_x,
      z: k.victim_z,
      team: k.victim_team,
      kind: "death",
    });
  }
  for (const u of ults) {
    events.push({
      t: u.match_time,
      x: u.player_x,
      z: u.player_z,
      team: u.player_team,
      kind: "ult",
    });
  }

  const rows = countEventsByZone(events, ctx.zonesAt);
  return rows.length > 0 ? { rows } : null;
}

export type ZoneAnalyticsServiceInterface = {
  readonly getZoneAnalytics: (
    mapDataId: number
  ) => Effect.Effect<{ rows: ZoneCountRow[] } | null, MapQueryError>;
};

export class ZoneAnalyticsService extends Context.Tag(
  "@app/data/map/ZoneAnalyticsService"
)<ZoneAnalyticsService, ZoneAnalyticsServiceInterface>() {}

const CACHE_TTL = Duration.seconds(30);
const CACHE_CAPACITY = 64;

export const make: Effect.Effect<ZoneAnalyticsServiceInterface> = Effect.gen(
  function* () {
    function getZoneAnalytics(
      mapDataId: number
    ): Effect.Effect<{ rows: ZoneCountRow[] } | null, MapQueryError> {
      const startTime = Date.now();
      const wideEvent: Record<string, unknown> = { mapDataId };

      return Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan("mapDataId", mapDataId);
        const resolvedId = yield* Effect.tryPromise({
          try: () => resolveMapDataId(mapDataId),
          catch: (error) =>
            new MapQueryError({
              operation: "resolve map data id for zone analytics",
              cause: error,
            }),
        });
        wideEvent.resolvedMapDataId = resolvedId;

        const result = yield* Effect.tryPromise({
          try: () => buildZoneAnalyticsForMapData(resolvedId),
          catch: (error) =>
            new MapQueryError({
              operation: "build zone analytics for map data",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("map.zoneAnalytics.build", {
            attributes: { mapDataId: resolvedId },
          })
        );

        if (result === null) {
          wideEvent.outcome = "success";
          wideEvent.result = "no_data";
          yield* Metric.increment(zoneAnalyticsQuerySuccessTotal);
          return null;
        }

        wideEvent.row_count = result.rows.length;
        wideEvent.outcome = "success";
        yield* Metric.increment(zoneAnalyticsQuerySuccessTotal);
        return result;
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            wideEvent.outcome = "error";
            wideEvent.error_tag = error._tag;
            wideEvent.error_message = error.message;
          }).pipe(
            Effect.andThen(Metric.increment(zoneAnalyticsQueryErrorTotal))
          )
        ),
        Effect.ensuring(
          Effect.suspend(() => {
            const durationMs = Date.now() - startTime;
            wideEvent.duration_ms = durationMs;
            wideEvent.outcome ??= "interrupted";
            const log =
              wideEvent.outcome === "error"
                ? Effect.logError("map.zoneAnalytics.getZoneAnalytics")
                : Effect.logInfo("map.zoneAnalytics.getZoneAnalytics");
            return log.pipe(
              Effect.annotateLogs(wideEvent),
              Effect.andThen(
                zoneAnalyticsQueryDuration(Effect.succeed(durationMs))
              )
            );
          })
        ),
        Effect.withSpan("map.zoneAnalytics.getZoneAnalytics")
      );
    }

    const zoneAnalyticsCache = yield* Cache.make({
      capacity: CACHE_CAPACITY,
      timeToLive: CACHE_TTL,
      lookup: (mapDataId: number) =>
        getZoneAnalytics(mapDataId).pipe(
          Effect.tap(() => Metric.increment(mapCacheMissTotal))
        ),
    });

    return {
      getZoneAnalytics: (mapDataId: number) =>
        zoneAnalyticsCache
          .get(mapDataId)
          .pipe(Effect.tap(() => Metric.increment(mapCacheRequestTotal))),
    } satisfies ZoneAnalyticsServiceInterface;
  }
);

export const ZoneAnalyticsServiceLive = Layer.effect(
  ZoneAnalyticsService,
  make
).pipe(Layer.provide(EffectObservabilityLive));
