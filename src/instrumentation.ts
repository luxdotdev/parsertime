import { logger } from "@/lib/axiom/server";
import { createOnRequestError } from "@axiomhq/nextjs";
import { DevTools } from "@effect/experimental";
import { NodeSdk } from "@effect/opentelemetry";
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
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-node";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import {
  PrismaInstrumentation,
  registerInstrumentations,
} from "@prisma/instrumentation";
import { Layer, Logger } from "effect";
import { version } from "../package.json";

export const onRequestError = createOnRequestError(logger);

const OTLP_CONFIG = {
  url: `https://api.axiom.co/v1/traces`,
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
    // Use the latest schema version
    // Info: https://opentelemetry.io/docs/specs/semconv/
    schemaUrl: "https://opentelemetry.io/schemas/1.37.0",
  }
);

export function register() {
  const otlpTraceExporter = new OTLPTraceExporter(OTLP_CONFIG);

  const provider = new NodeTracerProvider({
    resource: RESOURCE,
    spanProcessors: [
      IS_PROD
        ? new BatchSpanProcessor(otlpTraceExporter)
        : new SimpleSpanProcessor(otlpTraceExporter),
    ],
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

  // In serverless environments, instances can be shut down before the
  // PeriodicExportingMetricReader's next export tick fires. Neither the
  // OTel SDK nor Next.js registers SIGTERM handlers to flush providers,
  // so pending metrics and spans are silently dropped.
  // Force-flush both providers on SIGTERM to ensure nothing is lost.
  // globalThis avoids Turbopack's static "process.on" Edge Runtime warning
  // when this module is analyzed via layout.tsx imports.
  globalThis.process?.on("SIGTERM", async () => {
    await Promise.allSettled([
      provider.forceFlush(),
      meterProvider.forceFlush(),
    ]);
    await Promise.allSettled([provider.shutdown(), meterProvider.shutdown()]);
  });
}

const EffectTracingLive = NodeSdk.layer(() => ({
  resource: {
    serviceName: SERVICE_NAME,
    serviceVersion: SERVICE_VERSION,
    attributes: {
      [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: ENVIRONMENT,
    },
  },
  spanProcessor: IS_PROD
    ? new BatchSpanProcessor(new OTLPTraceExporter(OTLP_CONFIG))
    : new SimpleSpanProcessor(new OTLPTraceExporter(OTLP_CONFIG)),
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
