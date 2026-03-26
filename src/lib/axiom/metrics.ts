import { metrics } from "@opentelemetry/api";

const meter = metrics.getMeter("parsertime");

// --- Core funnel ---
export const authSignInCounter = meter.createCounter("auth.signins", {
  description: "Successful sign-ins",
});

export const authNewUserCounter = meter.createCounter("auth.new_users", {
  description: "New user registrations",
});

export const teamCreatedCounter = meter.createCounter("teams.created", {
  description: "Total teams created",
});

export const teamQuotaHitCounter = meter.createCounter("teams.quota_hits", {
  description: "Team creation blocked by billing plan quota",
});

export const scrimCreatedCounter = meter.createCounter("scrims.created", {
  description: "Total scrims created",
});

export const mapAddedCounter = meter.createCounter("scrims.maps_added", {
  description: "Total maps added to scrims",
});

export const mapRemovedCounter = meter.createCounter("scrims.maps_removed", {
  description: "Total maps removed from scrims",
});

// --- AI chat ---
export const chatRequestCounter = meter.createCounter("ai.chat.requests", {
  description: "Total AI chat requests",
});

export const chatTokensCounter = meter.createCounter("ai.chat.tokens", {
  description: "Total AI tokens consumed",
});

export const chatToolCallCounter = meter.createCounter("ai.chat.tool_calls", {
  description: "Total AI tool calls executed",
});

// --- Billing ---
export const stripeWebhookCounter = meter.createCounter("stripe.webhooks", {
  description: "Stripe webhook events received",
});

// --- Bot notifications ---
export const botNotificationCounter = meter.createCounter("bot.notifications", {
  description: "Bot notification delivery attempts",
});

// --- Cron jobs ---
export const cronJobCounter = meter.createCounter("cron.runs", {
  description: "Cron job executions",
});

export const cronDeletedItemsCounter = meter.createCounter(
  "cron.deleted_items",
  {
    description: "Items deleted by cron jobs",
  }
);

// --- Reliability ---
export const rateLimitHitCounter = meter.createCounter("ratelimit.hits", {
  description: "Rate limit rejections",
});

export const apiErrorCounter = meter.createCounter("api.errors", {
  description: "API errors by route and status code",
});

// --- Histograms ---
export const scrimParsingDuration = meter.createHistogram(
  "scrims.parse_duration_ms",
  {
    description: "Time to parse and store scrim data",
    unit: "ms",
  }
);

export const mapDeletionDuration = meter.createHistogram(
  "scrims.map_deletion_duration_ms",
  {
    description: "Time to cascade-delete a map and all related data",
    unit: "ms",
  }
);

export const chatResponseDuration = meter.createHistogram(
  "ai.chat.duration_ms",
  {
    description: "End-to-end AI chat response time",
    unit: "ms",
  }
);

export const chatToolCallDuration = meter.createHistogram(
  "ai.chat.tool_call_duration_ms",
  {
    description: "Individual AI tool call latency",
    unit: "ms",
  }
);

export const cronJobDuration = meter.createHistogram("cron.duration_ms", {
  description: "Cron job execution time",
  unit: "ms",
});
