import { SpanStatusCode, context, propagation, trace } from "@opentelemetry/api";

const API_BASE = process.env.PARSERTIME_API_URL;
const BOT_SECRET = process.env.BOT_SECRET;
const tracer = trace.getTracer("discord-bot");

type ApiSuccess<T> = { success: true; data: T };
type ApiError = { success: false; error: string };
type ApiResponse<T> = ApiSuccess<T> | ApiError;

export async function apiGet<T>(
  path: string,
  discordUserId?: string,
): Promise<ApiResponse<T>> {
  return tracer.startActiveSpan(`fetch GET ${path}`, async (span) => {
    span.setAttributes({
      "http.method": "GET",
      "http.url": `${API_BASE}${path}`,
    });

    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${BOT_SECRET}`,
      };
      if (discordUserId) {
        headers["X-Discord-User-Id"] = discordUserId;
      }
      propagation.inject(context.active(), headers);

      const res = await fetch(`${API_BASE}${path}`, { headers });
      const body = (await res.json()) as ApiResponse<T>;

      span.setAttributes({ "http.status_code": res.status });
      span.setStatus({
        code: body.success ? SpanStatusCode.OK : SpanStatusCode.ERROR,
        message: body.success ? undefined : body.error,
      });

      return body;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      if (error instanceof Error) span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  });
}

export async function apiPost<T>(
  path: string,
  payload: unknown,
  discordUserId?: string,
): Promise<ApiResponse<T>> {
  return tracer.startActiveSpan(`fetch POST ${path}`, async (span) => {
    span.setAttributes({
      "http.method": "POST",
      "http.url": `${API_BASE}${path}`,
    });

    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${BOT_SECRET}`,
        "Content-Type": "application/json",
      };
      if (discordUserId) {
        headers["X-Discord-User-Id"] = discordUserId;
      }
      propagation.inject(context.active(), headers);

      const res = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      const body = (await res.json()) as ApiResponse<T>;

      span.setAttributes({ "http.status_code": res.status });
      span.setStatus({
        code: body.success ? SpanStatusCode.OK : SpanStatusCode.ERROR,
        message: body.success ? undefined : body.error,
      });

      return body;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      if (error instanceof Error) span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  });
}
