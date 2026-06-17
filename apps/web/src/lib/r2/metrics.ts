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

export const downloadSuccessTotal = Metric.counter("r2.download.success", {
  description: "Total R2 downloads completed successfully",
  incremental: true,
});

export const downloadErrorTotal = Metric.counter("r2.download.error", {
  description: "Total R2 download failures",
  incremental: true,
});

export const downloadDuration = Metric.histogram(
  "r2.download.duration_ms",
  MetricBoundaries.exponential({ start: 50, factor: 2, count: 10 }),
  "Distribution of R2 download duration in milliseconds"
);
