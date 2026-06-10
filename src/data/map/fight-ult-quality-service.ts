import { EffectObservabilityLive } from "@/instrumentation";
import { resolveMapDataId } from "@/lib/map-data-resolver";
import {
  buildUltInstancesForMapData,
  getEngagementsForMapData,
  type EngagementWithZone,
} from "@/lib/ult-quality-db";
import type { UltInstance } from "@/lib/ult-quality";
import { Cache, Context, Duration, Effect, Layer, Metric } from "effect";
import { MapQueryError } from "./errors";
import {
  fightUltQualityQueryDuration,
  fightUltQualityQueryErrorTotal,
  fightUltQualityQuerySuccessTotal,
  mapCacheMissTotal,
  mapCacheRequestTotal,
} from "./metrics";

export type FightUltQualityResult = {
  mapDataId: number;
  ults: UltInstance[];
  engagements: EngagementWithZone[];
};

export type FightUltQualityServiceInterface = {
  readonly getFightUltQuality: (
    mapDataId: number
  ) => Effect.Effect<FightUltQualityResult | null, MapQueryError>;
};

export class FightUltQualityService extends Context.Tag(
  "@app/data/map/FightUltQualityService"
)<FightUltQualityService, FightUltQualityServiceInterface>() {}

const CACHE_TTL = Duration.seconds(30);
const CACHE_CAPACITY = 64;

export const make: Effect.Effect<FightUltQualityServiceInterface> = Effect.gen(
  function* () {
    function getFightUltQuality(
      mapDataId: number
    ): Effect.Effect<FightUltQualityResult | null, MapQueryError> {
      const startTime = Date.now();
      const wideEvent: Record<string, unknown> = { mapDataId };

      return Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan("mapDataId", mapDataId);
        const resolvedId = yield* Effect.tryPromise({
          try: () => resolveMapDataId(mapDataId),
          catch: (error) =>
            new MapQueryError({
              operation: "resolve map data id for fight ult quality",
              cause: error,
            }),
        });
        wideEvent.resolvedMapDataId = resolvedId;

        const [{ instances }, engagements] = yield* Effect.tryPromise({
          try: () =>
            Promise.all([
              buildUltInstancesForMapData(resolvedId),
              getEngagementsForMapData(resolvedId),
            ]),
          catch: (error) =>
            new MapQueryError({
              operation: "fetch fight ult quality data",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("map.fightUltQuality.fetch", {
            attributes: { mapDataId: resolvedId },
          })
        );

        wideEvent.ult_count = instances.length;
        wideEvent.engagement_count = engagements.length;

        if (instances.length === 0 && engagements.length === 0) {
          wideEvent.outcome = "success";
          wideEvent.result = "no_data";
          yield* Metric.increment(fightUltQualityQuerySuccessTotal);
          return null;
        }

        wideEvent.outcome = "success";
        yield* Metric.increment(fightUltQualityQuerySuccessTotal);
        return { mapDataId, ults: instances, engagements };
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            wideEvent.outcome = "error";
            wideEvent.error_tag = error._tag;
            wideEvent.error_message = error.message;
          }).pipe(
            Effect.andThen(Metric.increment(fightUltQualityQueryErrorTotal))
          )
        ),
        Effect.ensuring(
          Effect.suspend(() => {
            const durationMs = Date.now() - startTime;
            wideEvent.duration_ms = durationMs;
            wideEvent.outcome ??= "interrupted";
            const log =
              wideEvent.outcome === "error"
                ? Effect.logError("map.fightUltQuality.getFightUltQuality")
                : Effect.logInfo("map.fightUltQuality.getFightUltQuality");
            return log.pipe(
              Effect.annotateLogs(wideEvent),
              Effect.andThen(
                fightUltQualityQueryDuration(Effect.succeed(durationMs))
              )
            );
          })
        ),
        Effect.withSpan("map.fightUltQuality.getFightUltQuality")
      );
    }

    const fightUltQualityCache = yield* Cache.make({
      capacity: CACHE_CAPACITY,
      timeToLive: CACHE_TTL,
      lookup: (mapDataId: number) =>
        getFightUltQuality(mapDataId).pipe(
          Effect.tap(() => Metric.increment(mapCacheMissTotal))
        ),
    });

    return {
      getFightUltQuality: (mapDataId: number) =>
        fightUltQualityCache
          .get(mapDataId)
          .pipe(Effect.tap(() => Metric.increment(mapCacheRequestTotal))),
    } satisfies FightUltQualityServiceInterface;
  }
);

export const FightUltQualityServiceLive = Layer.effect(
  FightUltQualityService,
  make
).pipe(Layer.provide(EffectObservabilityLive));
