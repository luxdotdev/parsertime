import { EffectObservabilityLive } from "@/instrumentation";
import { resolveMapDataId } from "@/lib/map-data-resolver";
import {
  buildRouteAnalysisForMapData,
  type RouteAnalysis,
} from "@/lib/routes/routes-db";
import { Cache, Context, Duration, Effect, Layer, Metric } from "effect";
import { MapQueryError } from "./errors";
import {
  mapCacheMissTotal,
  mapCacheRequestTotal,
  routeMiningQueryDuration,
  routeMiningQueryErrorTotal,
  routeMiningQuerySuccessTotal,
} from "./metrics";

export type RouteMiningServiceInterface = {
  readonly getRouteAnalysis: (
    mapDataId: number
  ) => Effect.Effect<RouteAnalysis | null, MapQueryError>;
};

export class RouteMiningService extends Context.Tag(
  "@app/data/map/RouteMiningService"
)<RouteMiningService, RouteMiningServiceInterface>() {}

const CACHE_TTL = Duration.seconds(30);
const CACHE_CAPACITY = 64;

export const make: Effect.Effect<RouteMiningServiceInterface> = Effect.gen(
  function* () {
    function getRouteAnalysis(
      mapDataId: number
    ): Effect.Effect<RouteAnalysis | null, MapQueryError> {
      const startTime = Date.now();
      const wideEvent: Record<string, unknown> = { mapDataId };

      return Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan("mapDataId", mapDataId);
        const resolvedId = yield* Effect.tryPromise({
          try: () => resolveMapDataId(mapDataId),
          catch: (error) =>
            new MapQueryError({
              operation: "resolve map data id for route mining",
              cause: error,
            }),
        });
        wideEvent.resolvedMapDataId = resolvedId;

        const analysis = yield* Effect.tryPromise({
          try: () => buildRouteAnalysisForMapData(resolvedId),
          catch: (error) =>
            new MapQueryError({
              operation: "build route analysis for map data",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("map.routeMining.build", {
            attributes: { mapDataId: resolvedId },
          })
        );

        if (analysis === null) {
          wideEvent.outcome = "success";
          wideEvent.result = "no_data";
          yield* Metric.increment(routeMiningQuerySuccessTotal);
          return null;
        }

        wideEvent.route_count = analysis.routes.length;
        wideEvent.cluster_count = analysis.clusters.length;
        wideEvent.outcome = "success";
        yield* Metric.increment(routeMiningQuerySuccessTotal);
        return analysis;
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            wideEvent.outcome = "error";
            wideEvent.error_tag = error._tag;
            wideEvent.error_message = error.message;
          }).pipe(Effect.andThen(Metric.increment(routeMiningQueryErrorTotal)))
        ),
        Effect.ensuring(
          Effect.suspend(() => {
            const durationMs = Date.now() - startTime;
            wideEvent.duration_ms = durationMs;
            wideEvent.outcome ??= "interrupted";
            const log =
              wideEvent.outcome === "error"
                ? Effect.logError("map.routeMining.getRouteAnalysis")
                : Effect.logInfo("map.routeMining.getRouteAnalysis");
            return log.pipe(
              Effect.annotateLogs(wideEvent),
              Effect.andThen(routeMiningQueryDuration(Effect.succeed(durationMs)))
            );
          })
        ),
        Effect.withSpan("map.routeMining.getRouteAnalysis")
      );
    }

    const routeMiningCache = yield* Cache.make({
      capacity: CACHE_CAPACITY,
      timeToLive: CACHE_TTL,
      lookup: (mapDataId: number) =>
        getRouteAnalysis(mapDataId).pipe(
          Effect.tap(() => Metric.increment(mapCacheMissTotal))
        ),
    });

    return {
      getRouteAnalysis: (mapDataId: number) =>
        routeMiningCache
          .get(mapDataId)
          .pipe(Effect.tap(() => Metric.increment(mapCacheRequestTotal))),
    } satisfies RouteMiningServiceInterface;
  }
);

export const RouteMiningServiceLive = Layer.effect(
  RouteMiningService,
  make
).pipe(Layer.provide(EffectObservabilityLive));
