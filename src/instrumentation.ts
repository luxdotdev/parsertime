import { logger } from "@/lib/axiom/server";
import { createOnRequestError } from "@axiomhq/nextjs";
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

export const onRequestError = createOnRequestError(logger);

export function register() {
  const otlpTraceExporter = new OTLPTraceExporter({
    url: `https://api.axiom.co/v1/traces`,
    headers: {
      Authorization: `Bearer ${process.env.AXIOM_OTEL_TOKEN}`,
      "X-Axiom-Dataset": `${process.env.AXIOM_OTEL_DATASET}`,
    },
  });

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
