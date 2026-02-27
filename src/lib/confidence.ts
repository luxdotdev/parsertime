export type ConfidenceLevel = "high" | "medium" | "low" | "insufficient";

export type ConfidenceThresholds = {
  high?: number;
  medium?: number;
  low?: number;
};

export type ConfidenceMetadata = {
  level: ConfidenceLevel;
  sampleSize: number;
  minimumRequired: number;
  label: string;
};

const DEFAULT_THRESHOLDS: Required<ConfidenceThresholds> = {
  high: 20,
  medium: 10,
  low: 5,
};

export function assessConfidence(
  sampleSize: number,
  thresholds?: ConfidenceThresholds
): ConfidenceMetadata {
  const t = { ...DEFAULT_THRESHOLDS, ...thresholds };

  const level: ConfidenceLevel =
    sampleSize >= t.high
      ? "high"
      : sampleSize >= t.medium
        ? "medium"
        : sampleSize >= t.low
          ? "low"
          : "insufficient";

  const noun = sampleSize === 1 ? "map" : "maps";
  const label =
    sampleSize === 0 ? "No data available" : `Based on ${sampleSize} ${noun}`;

  return {
    level,
    sampleSize,
    minimumRequired: t.low,
    label,
  };
}

export function isSufficientConfidence(metadata: ConfidenceMetadata): boolean {
  return metadata.level !== "insufficient";
}
