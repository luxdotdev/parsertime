/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-console */
import { trace, type SpanContext } from "@opentelemetry/api";
import { log } from "next-axiom";

/**
 * To avoid using explicit console.log statements, we can use a logger to log messages to the console.
 * This allows us to easily search for and replace all console.log statements in the future.
 */

type LogLevel = "log" | "error" | "warn" | "info";

type TraceContext = {
  traceId?: string;
  spanId?: string;
};

export class Logger {
  static logLevel: LogLevel[] = ["log", "error", "warn", "info"];

  static isProduction = process.env.NODE_ENV === "production";

  /**
   * Gets the current OpenTelemetry trace context (trace ID and span ID)
   */
  static getTraceContext(): TraceContext {
    const span = trace.getActiveSpan();
    if (!span) {
      return {};
    }

    const spanContext: SpanContext = span.spanContext();
    return {
      traceId: spanContext.traceId,
      spanId: spanContext.spanId,
    };
  }

  /**
   * Enriches log data with trace context
   */
  private static enrichWithContext(message: any, ...optionalParams: any[]) {
    const traceContext = this.getTraceContext();

    if (Object.keys(traceContext).length === 0) {
      return { message, params: optionalParams };
    }

    if (typeof message === "string") {
      return { message, params: [traceContext, ...optionalParams] };
    } else if (typeof message === "object" && message !== null) {
      return {
        message: { ...message, ...traceContext },
        params: optionalParams,
      };
    }

    return { message, params: [traceContext, ...optionalParams] };
  }

  static log(message: any, ...optionalParams: any[]) {
    if (this.shouldLog("log")) {
      const enriched = this.enrichWithContext(message, ...optionalParams);
      log.debug(enriched.message, ...enriched.params);
    }
    console.log(message, ...optionalParams);
  }

  static error(message: any, ...optionalParams: any[]) {
    if (this.shouldLog("error")) {
      const enriched = this.enrichWithContext(message, ...optionalParams);
      log.error(enriched.message, ...enriched.params);
    }
    console.error(message, ...optionalParams);
  }

  static warn(message: any, ...optionalParams: any[]) {
    if (this.shouldLog("warn")) {
      const enriched = this.enrichWithContext(message, ...optionalParams);
      log.warn(enriched.message, ...enriched.params);
    }
    console.warn(message, ...optionalParams);
  }

  static info(message: any, ...optionalParams: any[]) {
    if (this.shouldLog("info")) {
      const enriched = this.enrichWithContext(message, ...optionalParams);
      log.info(enriched.message, ...enriched.params);
    }
    console.info(message, ...optionalParams);
  }

  private static shouldLog(level: LogLevel): boolean {
    if (this.isProduction) {
      return this.logLevel.includes(level);
    }
    return true;
  }
}
