import { logger } from "@/lib/axiom/server";
import { EffectLoggerLive } from "@/lib/effect-logger";
import { createOnRequestError } from "@axiomhq/nextjs";
import { NodeSdk } from "@effect/opentelemetry";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  BatchSpanProcessor,
  NodeTracerProvider,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-node";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import {
  PrismaInstrumentation,
  registerInstrumentations,
} from "@prisma/instrumentation";
import { Layer } from "effect";

export const onRequestError = createOnRequestError(logger);

const otlpConfig = {
  url: `https://api.axiom.co/v1/traces`,
  headers: {
    Authorization: `Bearer ${process.env.AXIOM_OTEL_TOKEN}`,
    "X-Axiom-Dataset": `${process.env.AXIOM_OTEL_DATASET}`,
  },
  timeoutMillis: 10000,
} as const satisfies NonNullable<
  ConstructorParameters<typeof OTLPTraceExporter>[0]
>;

export function register() {
  const otlpTraceExporter = new OTLPTraceExporter(otlpConfig);

  const provider = new NodeTracerProvider({
    resource: resourceFromAttributes(
      {
        [ATTR_SERVICE_NAME]: "parsertime",
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
}

export const EffectTracingLive = NodeSdk.layer(() => ({
  resource: { serviceName: "parsertime" },
  spanProcessor:
    process.env.NODE_ENV === "production"
      ? new BatchSpanProcessor(new OTLPTraceExporter(otlpConfig))
      : new SimpleSpanProcessor(new OTLPTraceExporter(otlpConfig)),
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
