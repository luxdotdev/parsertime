import { Effect, Layer, Metric, Runtime, Schedule } from "effect";
import type { Pool } from "pg";

export const dbPoolTotal = Metric.gauge("db.pool.total", {
  description: "Total pg connections in the pool",
});
export const dbPoolIdle = Metric.gauge("db.pool.idle", {
  description: "Idle pg connections in the pool",
});
export const dbPoolWaiting = Metric.gauge("db.pool.waiting", {
  description: "Requests queued waiting for a pg connection",
});
export const dbPoolActive = Metric.gauge("db.pool.active", {
  description: "pg connections currently checked out",
});

export const dbPoolConnectionsOpened = Metric.counter(
  "db.pool.connections_opened",
  { description: "pg connections created", incremental: true }
);
export const dbPoolConnectionsRemoved = Metric.counter(
  "db.pool.connections_removed",
  { description: "pg connections removed from the pool", incremental: true }
);
export const dbPoolErrors = Metric.counter("db.pool.errors", {
  description: "pg pool errors (idle client errors)",
  incremental: true,
});

const POLL_INTERVAL = "10 seconds";

export function samplePool(pool: Pool) {
  return Effect.gen(function* () {
    yield* Metric.set(dbPoolTotal, pool.totalCount);
    yield* Metric.set(dbPoolIdle, pool.idleCount);
    yield* Metric.set(dbPoolWaiting, pool.waitingCount);
    yield* Metric.set(dbPoolActive, pool.totalCount - pool.idleCount);
  });
}

/** Polls pool gauges on a fixed schedule and bridges pool events to
 * counters for the lifetime of the layer's scope. The error listener
 * doubles as the guard against pg's unhandled-'error'-event crash on
 * idle client errors. */
export function makePoolMetricsLive(pool: Pool): Layer.Layer<never> {
  return Layer.scopedDiscard(
    Effect.gen(function* () {
      const runtime = yield* Effect.runtime<never>();
      const runSync = Runtime.runSync(runtime);

      function onConnect() {
        runSync(Metric.increment(dbPoolConnectionsOpened));
      }
      function onRemove() {
        runSync(Metric.increment(dbPoolConnectionsRemoved));
      }
      function onError(error: Error) {
        runSync(
          Effect.zipRight(
            Metric.increment(dbPoolErrors),
            Effect.logError("pg pool error", { error: error.message })
          )
        );
      }

      yield* Effect.acquireRelease(
        Effect.sync(() => {
          pool.on("connect", onConnect);
          pool.on("remove", onRemove);
          pool.on("error", onError);
        }),
        () =>
          Effect.sync(() => {
            pool.off("connect", onConnect);
            pool.off("remove", onRemove);
            pool.off("error", onError);
          })
      );

      yield* samplePool(pool).pipe(
        Effect.repeat(Schedule.fixed(POLL_INTERVAL)),
        Effect.forkScoped
      );
    })
  );
}
