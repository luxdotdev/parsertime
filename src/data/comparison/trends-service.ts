import { EffectObservabilityLive } from "@/instrumentation";
import type { CalculatedStat, PlayerStat } from "@prisma/client";
import { Cache, Context, Duration, Effect, Layer, Metric } from "effect";
import { calculateTrends } from "./computation";
import {
  comparisonCacheRequestTotal,
  comparisonCacheMissTotal,
  trendsDuration,
  trendsErrorTotal,
  trendsSuccessTotal,
} from "./metrics";
import type { TrendsAnalysis } from "./types";

export { calculateTrends } from "./computation";

export type ComparisonTrendsServiceInterface = {
  readonly calculateTrends: (
    perMapStats: PlayerStat[],
    perMapCalculatedStats: CalculatedStat[][]
  ) => Effect.Effect<TrendsAnalysis, never>;
};

export class ComparisonTrendsService extends Context.Tag(
  "@app/data/comparison/ComparisonTrendsService"
)<ComparisonTrendsService, ComparisonTrendsServiceInterface>() {}

const CACHE_TTL = Duration.seconds(30);
const CACHE_CAPACITY = 64;

export const make: Effect.Effect<ComparisonTrendsServiceInterface> = Effect.gen(
  function* () {
    function calculateTrendsEffect(
      perMapStats: PlayerStat[],
      perMapCalculatedStats: CalculatedStat[][]
    ): Effect.Effect<TrendsAnalysis, never> {
      const startTime = Date.now();
      const wideEvent: Record<string, unknown> = {
        perMapStatCount: perMapStats.length,
        perMapCalculatedStatGroupCount: perMapCalculatedStats.length,
      };

      return Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan(
          "perMapStatCount",
          perMapStats.length
        );
        const result = calculateTrends(perMapStats, perMapCalculatedStats);

        wideEvent.improvingCount = result.improvingMetrics.length;
        wideEvent.decliningCount = result.decliningMetrics.length;
        wideEvent.hasEarlyPerformance = !!result.earlyPerformance;
        wideEvent.hasLatePerformance = !!result.latePerformance;
        wideEvent.outcome = "success";
        yield* Metric.increment(trendsSuccessTotal);

        return result;
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            wideEvent.outcome = "error";
            wideEvent.error_tag = (error as { _tag?: string })._tag;
            wideEvent.error_message = String(error);
          }).pipe(Effect.andThen(Metric.increment(trendsErrorTotal)))
        ),
        Effect.ensuring(
          Effect.suspend(() => {
            const durationMs = Date.now() - startTime;
            wideEvent.duration_ms = durationMs;
            wideEvent.outcome ??= "interrupted";
            const log =
              wideEvent.outcome === "error"
                ? Effect.logError("comparison.calculateTrends")
                : Effect.logInfo("comparison.calculateTrends");
            return log.pipe(
              Effect.annotateLogs(wideEvent),
              Effect.andThen(trendsDuration(Effect.succeed(durationMs)))
            );
          })
        ),
        Effect.withSpan("comparison.calculateTrends")
      );
    }

    const trendsCache = yield* Cache.make({
      capacity: CACHE_CAPACITY,
      timeToLive: CACHE_TTL,
      lookup: (key: string) => {
        const [perMapStats, perMapCalculatedStats] = JSON.parse(key) as [
          PlayerStat[],
          CalculatedStat[][],
        ];
        return calculateTrendsEffect(perMapStats, perMapCalculatedStats).pipe(
          Effect.tap(() => Metric.increment(comparisonCacheMissTotal))
        );
      },
    });

    return {
      calculateTrends: (
        perMapStats: PlayerStat[],
        perMapCalculatedStats: CalculatedStat[][]
      ) =>
        trendsCache
          .get(JSON.stringify([perMapStats, perMapCalculatedStats]))
          .pipe(
            Effect.tap(() => Metric.increment(comparisonCacheRequestTotal))
          ),
    } satisfies ComparisonTrendsServiceInterface;
  }
);

export const ComparisonTrendsServiceLive = Layer.effect(
  ComparisonTrendsService,
  make
).pipe(Layer.provide(EffectObservabilityLive));
