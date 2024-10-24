import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { SimpleSpanProcessor } from "@opentelemetry/sdk-trace-node";
import { registerOTel } from "@vercel/otel";

export function register() {
  registerOTel({
    serviceName: "parsertime",
    spanProcessors: [
      new SimpleSpanProcessor(
        new OTLPTraceExporter({
          url: process.env.OTEL_API_URL,
        })
      ),
    ],
  });
}
