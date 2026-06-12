import { FEATURE_NAMES, featureHash } from "./features";
import type { ModeFamily } from "./types";

export type FamilyModel = {
  weights: number[];
  bias: number;
  means: number[];
  stds: number[];
  sampleCount: number;
  /** Grouped-CV metrics recorded at training time (absent on test fixtures). */
  metrics?: { logLoss: number; brier: number; baseRate: number };
};

export type ModelArtifact = {
  schemaVersion: 1;
  modelVersion: number;
  createdAt: string;
  featureHash: string;
  modeFamilies: Record<ModeFamily, FamilyModel | null>;
};

export class WPModelMismatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WPModelMismatchError";
  }
}

function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

/**
 * Returns P(win) for the given perspective's feature vector, or null when
 * no model exists for the mode family (thin data → surface hidden upstream).
 */
export function predictWinProbability(
  artifact: ModelArtifact,
  family: ModeFamily,
  features: number[]
): number | null {
  if (artifact.featureHash !== featureHash()) {
    throw new WPModelMismatchError(
      `artifact feature hash ${artifact.featureHash} != code ${featureHash()}`
    );
  }
  const model = artifact.modeFamilies[family];
  if (model === null) return null;
  if (
    features.length !== FEATURE_NAMES.length ||
    model.weights.length !== FEATURE_NAMES.length
  ) {
    throw new WPModelMismatchError(
      `feature length ${features.length} != ${FEATURE_NAMES.length}`
    );
  }
  let z = model.bias;
  for (let i = 0; i < features.length; i++) {
    const std = model.stds[i] === 0 ? 1 : model.stds[i];
    z += model.weights[i] * ((features[i] - model.means[i]) / std);
  }
  return sigmoid(z);
}
