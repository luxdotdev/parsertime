import type { Counter, Histogram, Meter } from "@opentelemetry/api";
import { metrics } from "@opentelemetry/api";

// Lazy initialization — the meter must be obtained after register()
// in instrumentation.ts has called setGlobalMeterProvider().
// Module-level getMeter() returns a NoopMeter since the provider isn't set yet.
let _meter: Meter | null = null;
function getMeter() {
  _meter ??= metrics.getMeter("parsertime");
  return _meter;
}

function lazyCounter(name: string, description: string) {
  let _counter: Counter | null = null;
  return {
    add(value: number, attributes?: Record<string, string>) {
      _counter ??= getMeter().createCounter(name, { description });
      _counter.add(value, attributes);
    },
  };
}

function lazyHistogram(name: string, description: string, unit: string) {
  let _histogram: Histogram | null = null;
  return {
    record(value: number, attributes?: Record<string, string>) {
      _histogram ??= _histogram = getMeter().createHistogram(name, {
        description,
        unit,
      });
      _histogram.record(value, attributes);
    },
  };
}

// --- Core funnel ---
export const authSignInCounter = lazyCounter(
  "auth.signins",
  "Successful sign-ins"
);
export const authNewUserCounter = lazyCounter(
  "auth.new_users",
  "New user registrations"
);
export const teamCreatedCounter = lazyCounter(
  "teams.created",
  "Total teams created"
);
export const teamQuotaHitCounter = lazyCounter(
  "teams.quota_hits",
  "Team creation blocked by billing plan quota"
);
export const scrimCreatedCounter = lazyCounter(
  "scrims.created",
  "Total scrims created"
);
export const mapAddedCounter = lazyCounter(
  "scrims.maps_added",
  "Total maps added to scrims"
);
export const mapRemovedCounter = lazyCounter(
  "scrims.maps_removed",
  "Total maps removed from scrims"
);

// --- AI chat ---
export const chatRequestCounter = lazyCounter(
  "ai.chat.requests",
  "Total AI chat requests"
);
export const chatTokensCounter = lazyCounter(
  "ai.chat.tokens",
  "Total AI tokens consumed"
);
export const chatToolCallCounter = lazyCounter(
  "ai.chat.tool_calls",
  "Total AI tool calls executed"
);

// --- Billing ---
export const stripeWebhookCounter = lazyCounter(
  "stripe.webhooks",
  "Stripe webhook events received"
);

// --- Bot notifications ---
export const botNotificationCounter = lazyCounter(
  "bot.notifications",
  "Bot notification delivery attempts"
);

// --- Cron jobs ---
export const cronJobCounter = lazyCounter("cron.runs", "Cron job executions");
export const cronDeletedItemsCounter = lazyCounter(
  "cron.deleted_items",
  "Items deleted by cron jobs"
);

// --- Reliability ---
export const rateLimitHitCounter = lazyCounter(
  "ratelimit.hits",
  "Rate limit rejections"
);
export const apiErrorCounter = lazyCounter(
  "api.errors",
  "API errors by route and status code"
);

// --- Histograms ---
export const scrimParsingDuration = lazyHistogram(
  "scrims.parse_duration_ms",
  "Time to parse and store scrim data",
  "ms"
);
export const mapDeletionDuration = lazyHistogram(
  "scrims.map_deletion_duration_ms",
  "Time to cascade-delete a map and all related data",
  "ms"
);
export const chatResponseDuration = lazyHistogram(
  "ai.chat.duration_ms",
  "End-to-end AI chat response time",
  "ms"
);
export const chatToolCallDuration = lazyHistogram(
  "ai.chat.tool_call_duration_ms",
  "Individual AI tool call latency",
  "ms"
);
export const cronJobDuration = lazyHistogram(
  "cron.duration_ms",
  "Cron job execution time",
  "ms"
);
