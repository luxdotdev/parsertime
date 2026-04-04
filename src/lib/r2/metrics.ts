import { Metric, MetricBoundaries } from "effect";

export const uploadSuccessTotal = Metric.counter("r2.upload.success", {
  description: "Total R2 uploads completed successfully",
  incremental: true,
});

export const uploadErrorTotal = Metric.counter("r2.upload.error", {
  description: "Total R2 upload failures",
  incremental: true,
});

export const uploadDuration = Metric.histogram(
  "r2.upload.duration_ms",
  MetricBoundaries.exponential({ start: 50, factor: 2, count: 10 }),
  "Distribution of R2 upload duration in milliseconds"
);

export const deleteSuccessTotal = Metric.counter("r2.delete.success", {
  description: "Total R2 deletes completed successfully",
  incremental: true,
});

export const deleteErrorTotal = Metric.counter("r2.delete.error", {
  description: "Total R2 delete failures",
  incremental: true,
});

export const presignDuration = Metric.histogram(
  "r2.presign.duration_ms",
  MetricBoundaries.exponential({ start: 1, factor: 2, count: 10 }),
  "Distribution of presigned URL generation duration in milliseconds"
);
