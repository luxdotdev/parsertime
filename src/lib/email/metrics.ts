import { Metric, MetricBoundaries } from "effect";

export const emailSentTotal = Metric.counter("email.send.success", {
  description: "Total emails sent successfully",
  incremental: true,
});

export const emailErrorTotal = Metric.counter("email.send.error", {
  description: "Total email send failures",
  incremental: true,
});

/**
 * Boundaries (ms): 10, 20, 40, 80, 160, 320, 640, 1280, 2560, 5120
 */
export const emailSendDuration = Metric.histogram(
  "email.send.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of email send duration in milliseconds"
);
