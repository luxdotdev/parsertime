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

const ENVIRONMENT = process.env.RAILWAY_ENVIRONMENT ?? "development";

const otlpTraceExporter = new OTLPTraceExporter({
  url: "https://api.axiom.co/v1/traces",
  headers: {
    Authorization: `Bearer ${process.env.AXIOM_OTEL_TOKEN}`,
    "X-Axiom-Dataset": `${process.env.AXIOM_OTEL_DATASET}`,
  },
});

const provider = new NodeTracerProvider({
  resource: resourceFromAttributes(
    {
      [ATTR_SERVICE_NAME]: "discord-bot",
      "deployment.environment": ENVIRONMENT,
    },
    {
      schemaUrl: "https://opentelemetry.io/schemas/1.37.0",
    },
  ),
  spanProcessors: [
    ENVIRONMENT === "production"
      ? new BatchSpanProcessor(otlpTraceExporter)
      : new SimpleSpanProcessor(otlpTraceExporter),
  ],
});

registerInstrumentations({
  tracerProvider: provider,
  instrumentations: [new PrismaInstrumentation()],
});

provider.register();
