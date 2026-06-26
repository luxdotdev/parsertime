import { logger } from "@/lib/axiom/server";
import { makePoolMetricsLive } from "@/lib/db-metrics";
import { getDbPool } from "@/lib/prisma";
import { DevTools } from "@effect/experimental";
import { Metrics, NodeSdk, Resource } from "@effect/opentelemetry";
import { metrics } from "@opentelemetry/api";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-proto";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  AggregationTemporality,
  MeterProvider,
  PeriodicExportingMetricReader,
} from "@opentelemetry/sdk-metrics";
import {
  BatchSpanProcessor,
  NodeTracerProvider,
} from "@opentelemetry/sdk-trace-node";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import {
  PrismaInstrumentation,
  registerInstrumentations,
} from "@prisma/instrumentation";
import { Effect, Fiber, Layer, Logger } from "effect";
import type { Instrumentation } from "next";
import { version } from "../package.json";

const OTLP_CONFIG = {
  url: "https://api.axiom.co/v1/traces",
  headers: {
    Authorization: `Bearer ${process.env.AXIOM_OTEL_TOKEN}`,
    "X-Axiom-Dataset": process.env.AXIOM_OTEL_DATASET,
  },
  timeoutMillis: 10_000,
} as const satisfies NonNullable<
  ConstructorParameters<typeof OTLPTraceExporter>[0]
>;

const METRIC_EXPORTER_CONFIG = {
  url: "https://api.axiom.co/v1/metrics",
  headers: {
    Authorization: `Bearer ${process.env.AXIOM_METRICS_TOKEN}`,
    "X-Axiom-Metrics-Dataset": process.env.AXIOM_METRICS_DATASET,
  },
  temporalityPreference: AggregationTemporality.DELTA,
  timeoutMillis: 10_000,
} as const satisfies NonNullable<
  ConstructorParameters<typeof OTLPMetricExporter>[0]
>;

const SERVICE_NAME = "parsertime";
const ATTR_DEPLOYMENT_ENVIRONMENT_NAME = "deployment.environment.name";
const SERVICE_VERSION = process.env.VERCEL_GIT_COMMIT_SHA ?? version;
const ENVIRONMENT = process.env.NODE_ENV ?? "development";
const IS_PROD = ENVIRONMENT === "production";

const RESOURCE = resourceFromAttributes(
  {
    [ATTR_SERVICE_NAME]: SERVICE_NAME,
    [ATTR_SERVICE_VERSION]: SERVICE_VERSION,
    [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: ENVIRONMENT,
  },
  {
    schemaUrl: "https://opentelemetry.io/schemas/1.37.0",
  }
);

export function registerNode() {
  const otlpTraceExporter = new OTLPTraceExporter(OTLP_CONFIG);

  const provider = new NodeTracerProvider({
    resource: RESOURCE,
    // BatchSpanProcessor exports on a timer rather than synchronously on span
    // end, so trace export never reads Date.now() inside a Cache Components
    // prerender pass (which the dev server runs per request).
    spanProcessors: [new BatchSpanProcessor(otlpTraceExporter)],
  });

  registerInstrumentations({
    tracerProvider: provider,
    instrumentations: [new PrismaInstrumentation()],
  });

  provider.register();

  const meterProvider = new MeterProvider({
    resource: RESOURCE,
    readers: [
      new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter(METRIC_EXPORTER_CONFIG),
        exportIntervalMillis: 10_000,
        exportTimeoutMillis: 5_000,
      }),
    ],
  });

  metrics.setGlobalMeterProvider(meterProvider);

  // Single process-wide reader for Effect's global metric registry.
  // Without this, Effect metrics (email.*, *.query.*, db.pool.*) are
  // recorded but never exported — services only mount the logger layer.
  const EffectMetricsLive = Metrics.layer(
    () =>
      new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter(METRIC_EXPORTER_CONFIG),
        exportIntervalMillis: 10_000,
        exportTimeoutMillis: 5_000,
      })
  ).pipe(
    Layer.provide(
      Resource.layer({
        serviceName: SERVICE_NAME,
        serviceVersion: SERVICE_VERSION,
        attributes: { [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: ENVIRONMENT },
      })
    )
  );

  const effectMetricsFiber = Effect.runFork(
    Layer.launch(
      makePoolMetricsLive(getDbPool()).pipe(Layer.provide(EffectMetricsLive))
    )
  );

  process.on("SIGTERM", async () => {
    await Effect.runPromise(Fiber.interrupt(effectMetricsFiber)).catch(() => {
      // Ignore interruption errors during shutdown.
    });
    await Promise.allSettled([
      provider.forceFlush(),
      meterProvider.forceFlush(),
    ]);
    await Promise.allSettled([provider.shutdown(), meterProvider.shutdown()]);
  });
}

type RequestErrorArgs = Parameters<Instrumentation.onRequestError>;

export async function logRequestError(
  error: RequestErrorArgs[0],
  request: RequestErrorArgs[1],
  context: RequestErrorArgs[2]
) {
  const requestError =
    error instanceof Error ? error : new Error("Unknown request error");
  const digest =
    typeof error === "object" && error && "digest" in error
      ? String((error as { digest?: unknown }).digest)
      : undefined;
  let pathname = request.path;
  try {
    pathname = new URL(request.path, "https://parsertime.app").pathname;
  } catch {
    pathname = request.path.split("?")[0] ?? request.path;
  }

  logger.error("Unhandled request error", {
    error: {
      name: requestError.name,
      message: requestError.message,
      digest,
    },
    request: {
      method: request.method,
      path: pathname,
    },
    context: {
      routePath: context.routePath,
      routeType: context.routeType,
      routerKind: context.routerKind,
      renderSource: context.renderSource,
      revalidateReason: context.revalidateReason,
    },
  });
  await logger.flush();
}

const EffectTracingLive = NodeSdk.layer(() => ({
  resource: {
    serviceName: SERVICE_NAME,
    serviceVersion: SERVICE_VERSION,
    attributes: {
      [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: ENVIRONMENT,
    },
  },
  spanProcessor: new BatchSpanProcessor(new OTLPTraceExporter(OTLP_CONFIG)),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter(METRIC_EXPORTER_CONFIG),
    exportIntervalMillis: 10_000,
    exportTimeoutMillis: 5_000,
  }),
  shutdownTimeout: "2 seconds",
}));

const DevToolsLive = IS_PROD ? Layer.empty : DevTools.layer();

export const EffectObservabilityLive = Layer.mergeAll(
  DevToolsLive,
  EffectTracingLive,
  IS_PROD ? Logger.structured : Logger.pretty
);
