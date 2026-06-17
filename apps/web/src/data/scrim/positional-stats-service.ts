import { EffectObservabilityLive } from "@/instrumentation";
import {
  aggregateStatsByPlayer,
  POSITIONAL_STAT_TYPES,
} from "@/lib/positional-rollups";
import prisma from "@/lib/prisma";
import { Cache, Context, Duration, Effect, Layer, Metric } from "effect";
import { ScrimQueryError } from "./errors";
import {
  scrimCacheMissTotal,
  scrimCacheRequestTotal,
  scrimPositionalStatsDuration,
  scrimPositionalStatsErrorTotal,
  scrimPositionalStatsSuccessTotal,
} from "./metrics";

export type ScrimPositionalStats = {
  players: { playerName: string; stats: Record<string, number> }[];
};

export type ScrimPositionalStatsServiceInterface = {
  readonly getScrimPositionalStats: (
    scrimId: number
  ) => Effect.Effect<ScrimPositionalStats | null, ScrimQueryError>;
};

export class ScrimPositionalStatsService extends Context.Tag(
  "@app/data/scrim/ScrimPositionalStatsService"
)<ScrimPositionalStatsService, ScrimPositionalStatsServiceInterface>() {}

const CACHE_TTL = Duration.seconds(30);
const CACHE_CAPACITY = 64;

export const make: Effect.Effect<ScrimPositionalStatsServiceInterface> =
  Effect.gen(function* () {
    function getScrimPositionalStats(
      scrimId: number
    ): Effect.Effect<ScrimPositionalStats | null, ScrimQueryError> {
      const startTime = Date.now();
      const wideEvent: Record<string, unknown> = { scrimId };

      return Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan("scrimId", scrimId);

        const rows = yield* Effect.tryPromise({
          try: () =>
            prisma.calculatedStat.findMany({
              where: {
                scrimId,
                stat: { in: [...POSITIONAL_STAT_TYPES] },
              },
              select: { playerName: true, stat: true, value: true },
            }),
          catch: (error) =>
            new ScrimQueryError({
              operation: "getScrimPositionalStats.fetchStats",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("scrim.positional_stats.fetchStats", {
            attributes: { scrimId },
          })
        );

        if (rows.length === 0) {
          wideEvent.row_count = 0;
          wideEvent.outcome = "success";
          wideEvent.early_return = "no_rows";
          yield* Metric.increment(scrimPositionalStatsSuccessTotal);
          return null;
        }

        const byPlayer = aggregateStatsByPlayer(rows);
        const players = Array.from(byPlayer, ([playerName, perStat]) => ({
          playerName,
          stats: Object.fromEntries(perStat),
        })).sort((a, b) => a.playerName.localeCompare(b.playerName));

        wideEvent.row_count = rows.length;
        wideEvent.player_count = players.length;
        wideEvent.outcome = "success";
        yield* Metric.increment(scrimPositionalStatsSuccessTotal);

        return { players };
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            wideEvent.outcome = "error";
            wideEvent.error_tag = error._tag;
            wideEvent.error_message = error.message;
          }).pipe(
            Effect.andThen(Metric.increment(scrimPositionalStatsErrorTotal))
          )
        ),
        Effect.ensuring(
          Effect.suspend(() => {
            const durationMs = Date.now() - startTime;
            wideEvent.duration_ms = durationMs;
            wideEvent.outcome ??= "interrupted";
            const log =
              wideEvent.outcome === "error"
                ? Effect.logError("scrim.getScrimPositionalStats")
                : Effect.logInfo("scrim.getScrimPositionalStats");
            return log.pipe(
              Effect.annotateLogs(wideEvent),
              Effect.andThen(
                scrimPositionalStatsDuration(Effect.succeed(durationMs))
              )
            );
          })
        ),
        Effect.withSpan("scrim.getScrimPositionalStats")
      );
    }

    const cache = yield* Cache.make({
      capacity: CACHE_CAPACITY,
      timeToLive: CACHE_TTL,
      lookup: (scrimId: number) =>
        getScrimPositionalStats(scrimId).pipe(
          Effect.tap(() => Metric.increment(scrimCacheMissTotal))
        ),
    });

    return {
      getScrimPositionalStats: (scrimId: number) =>
        cache
          .get(scrimId)
          .pipe(Effect.tap(() => Metric.increment(scrimCacheRequestTotal))),
    } satisfies ScrimPositionalStatsServiceInterface;
  });

export const ScrimPositionalStatsServiceLive = Layer.effect(
  ScrimPositionalStatsService,
  make
).pipe(Layer.provide(EffectObservabilityLive));
