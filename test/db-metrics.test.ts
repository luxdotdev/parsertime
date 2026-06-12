import {
  dbPoolActive,
  dbPoolConnectionsOpened,
  dbPoolConnectionsRemoved,
  dbPoolErrors,
  dbPoolIdle,
  dbPoolTotal,
  dbPoolWaiting,
  makePoolMetricsLive,
  samplePool,
} from "@/lib/db-metrics";
import { Effect, Exit, Layer, Metric, Scope } from "effect";
import { EventEmitter } from "node:events";
import type { Pool } from "pg";
import { describe, expect, test } from "vitest";

class StubPool extends EventEmitter {
  totalCount = 0;
  idleCount = 0;
  waitingCount = 0;
}

const asPool = (stub: StubPool) => stub as unknown as Pool;

describe("samplePool", () => {
  test("records pool stats into the gauges", async () => {
    const stub = new StubPool();
    stub.totalCount = 7;
    stub.idleCount = 3;
    stub.waitingCount = 2;

    await Effect.runPromise(samplePool(asPool(stub)));

    expect((await Effect.runPromise(Metric.value(dbPoolTotal))).value).toBe(7);
    expect((await Effect.runPromise(Metric.value(dbPoolIdle))).value).toBe(3);
    expect((await Effect.runPromise(Metric.value(dbPoolWaiting))).value).toBe(
      2
    );
    expect((await Effect.runPromise(Metric.value(dbPoolActive))).value).toBe(4);
  });
});

describe("makePoolMetricsLive", () => {
  test("bridges pool events to counters and detaches on scope close", async () => {
    const stub = new StubPool();
    const scope = Effect.runSync(Scope.make());

    await Effect.runPromise(
      Layer.buildWithScope(makePoolMetricsLive(asPool(stub)), scope)
    );

    expect(stub.listenerCount("connect")).toBe(1);
    expect(stub.listenerCount("remove")).toBe(1);
    expect(stub.listenerCount("error")).toBe(1);

    stub.emit("connect");
    stub.emit("connect");
    stub.emit("remove");
    // Must not throw: the listener is the unhandled-error guard.
    stub.emit("error", new Error("boom"));

    expect(
      (await Effect.runPromise(Metric.value(dbPoolConnectionsOpened))).count
    ).toBe(2);
    expect(
      (await Effect.runPromise(Metric.value(dbPoolConnectionsRemoved))).count
    ).toBe(1);
    expect((await Effect.runPromise(Metric.value(dbPoolErrors))).count).toBe(1);

    await Effect.runPromise(Scope.close(scope, Exit.void));

    expect(stub.listenerCount("connect")).toBe(0);
    expect(stub.listenerCount("remove")).toBe(0);
    expect(stub.listenerCount("error")).toBe(0);
  });
});
