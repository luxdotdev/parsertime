import { metrics } from "@opentelemetry/api";

const meter = metrics.getMeter("parsertime");

export const scrimCreatedCounter = meter.createCounter("scrims.created", {
  description: "Total scrims created",
});

export const mapAddedCounter = meter.createCounter("scrims.maps_added", {
  description: "Total maps added to scrims",
});

export const chatRequestCounter = meter.createCounter("ai.chat.requests", {
  description: "Total AI chat requests",
});

export const chatTokensCounter = meter.createCounter("ai.chat.tokens", {
  description: "Total AI tokens consumed",
});

export const chatToolCallCounter = meter.createCounter("ai.chat.tool_calls", {
  description: "Total AI tool calls executed",
});

export const stripeWebhookCounter = meter.createCounter("stripe.webhooks", {
  description: "Stripe webhook events received",
});

export const authSignInCounter = meter.createCounter("auth.signins", {
  description: "Successful sign-ins",
});

export const authNewUserCounter = meter.createCounter("auth.new_users", {
  description: "New user registrations",
});

export const rateLimitHitCounter = meter.createCounter("ratelimit.hits", {
  description: "Rate limit rejections",
});

export const apiErrorCounter = meter.createCounter("api.errors", {
  description: "API errors by route and status code",
});

export const scrimParsingDuration = meter.createHistogram(
  "scrims.parse_duration_ms",
  {
    description: "Time to parse and store scrim data",
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
