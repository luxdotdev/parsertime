import { logger } from "@/lib/axiom/server";
import { EffectLoggerLive } from "@/lib/effect-logger";
import { createOnRequestError } from "@axiomhq/nextjs";
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
import { Layer } from "effect";

export const onRequestError = createOnRequestError(logger);

const OTLP_CONFIG = {
  url: `https://api.axiom.co/v1/traces`,
  headers: {
    Authorization: `Bearer ${process.env.AXIOM_OTEL_TOKEN}`,
    "X-Axiom-Dataset": `${process.env.AXIOM_OTEL_DATASET}`,
  },
  timeoutMillis: 10000,
} as const satisfies NonNullable<
  ConstructorParameters<typeof OTLPTraceExporter>[0]
>;

const SERVICE_NAME = "parsertime";

export function register() {
  const otlpTraceExporter = new OTLPTraceExporter(OTLP_CONFIG);

  const provider = new NodeTracerProvider({
    resource: resourceFromAttributes(
      {
        [ATTR_SERVICE_NAME]: SERVICE_NAME,
        [ATTR_SERVICE_VERSION]: process.env.VERCEL_GIT_COMMIT_SHA,
      },
      {
        // Use the latest schema version
        // Info: https://opentelemetry.io/docs/specs/semconv/
        schemaUrl: "https://opentelemetry.io/schemas/1.37.0",
      }
    ),
    spanProcessors: [
      process.env.NODE_ENV === "production"
        ? new BatchSpanProcessor(otlpTraceExporter)
        : new SimpleSpanProcessor(otlpTraceExporter),
    ],
  });

  registerInstrumentations({
    tracerProvider: provider,
    instrumentations: [new PrismaInstrumentation()],
  });

  provider.register();

  const metricExporter = new OTLPMetricExporter({
    url: "https://api.axiom.co/v1/metrics",
    headers: {
      Authorization: `Bearer ${process.env.AXIOM_METRICS_TOKEN}`,
      "X-Axiom-Metrics-Dataset": process.env.AXIOM_METRICS_DATASET,
    },
    temporalityPreference: AggregationTemporality.DELTA,
  });

  const meterProvider = new MeterProvider({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: SERVICE_NAME,
      [ATTR_SERVICE_VERSION]: process.env.VERCEL_GIT_COMMIT_SHA,
    }),
    readers: [
      new PeriodicExportingMetricReader({
        exporter: metricExporter,
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
  process.on("SIGTERM", async () => {
    await Promise.allSettled([
      provider.forceFlush(),
      meterProvider.forceFlush(),
    ]);
    await Promise.allSettled([provider.shutdown(), meterProvider.shutdown()]);
  });
}

export const EffectTracingLive = NodeSdk.layer(() => ({
  resource: { serviceName: SERVICE_NAME },
  spanProcessor:
    process.env.NODE_ENV === "production"
      ? new BatchSpanProcessor(new OTLPTraceExporter(OTLP_CONFIG))
      : new SimpleSpanProcessor(new OTLPTraceExporter(OTLP_CONFIG)),
}));

/**
 * Combined observability layer that includes both OpenTelemetry tracing
 * and environment-appropriate logging (pretty in dev, structured in prod).
 *
 * Use this layer in all Effect services and API routes to ensure
 * consistent observability across the application.
 */
export const EffectObservabilityLive = Layer.mergeAll(
  EffectTracingLive,
  EffectLoggerLive
);
