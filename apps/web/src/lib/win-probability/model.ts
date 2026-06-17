import { applyCalibration, type CalibrationMap } from "./calibration";
import { FEATURE_NAMES, featureHash } from "./features";
import type { ModeFamily } from "./types";

export type FamilyMetrics = {
  logLoss: number;
  brier: number;
  baseRate: number;
};

export type LRFamilyModel = {
  kind?: "lr";
  weights: number[];
  bias: number;
  means: number[];
  stds: number[];
  sampleCount: number;
  /** Isotonic recalibration fitted on held-out CV predictions. */
  calibration?: CalibrationMap;
  metrics?: FamilyMetrics;
};

/** Internal node: children are indices into the same flat node array. Leaf: a
 * constant added to the raw score. LightGBM numeric split: go left if
 * value <= threshold; NaN follows defaultLeft (our features carry no NaN). */
export type GBMTreeNode =
  | {
      feature: number;
      threshold: number;
      left: number;
      right: number;
      defaultLeft: boolean;
    }
  | { leaf: number };

export type GBMFamilyModel = {
  kind: "gbm";
  trees: GBMTreeNode[][];
  baseScore: number;
  sampleCount: number;
  calibration?: CalibrationMap;
  metrics?: FamilyMetrics;
};

export type FamilyModel = LRFamilyModel | GBMFamilyModel;

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

function gbmRawScore(model: GBMFamilyModel, features: number[]): number {
  let sum = model.baseScore;
  for (const tree of model.trees) {
    let i = 0;
    for (;;) {
      const node = tree[i];
      if ("leaf" in node) {
        sum += node.leaf;
        break;
      }
      const v = features[node.feature];
      i = Number.isNaN(v)
        ? node.defaultLeft
          ? node.left
          : node.right
        : v <= node.threshold
          ? node.left
          : node.right;
    }
  }
  return sum;
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
  if (features.length !== FEATURE_NAMES.length) {
    throw new WPModelMismatchError(
      `feature length ${features.length} != ${FEATURE_NAMES.length}`
    );
  }
  let raw: number;
  if (model.kind === "gbm") {
    raw = sigmoid(gbmRawScore(model, features));
  } else {
    if (model.weights.length !== FEATURE_NAMES.length) {
      throw new WPModelMismatchError(
        `weight length ${model.weights.length} != ${FEATURE_NAMES.length}`
      );
    }
    let z = model.bias;
    for (let i = 0; i < features.length; i++) {
      const std = model.stds[i] === 0 ? 1 : model.stds[i];
      z += model.weights[i] * ((features[i] - model.means[i]) / std);
    }
    raw = sigmoid(z);
  }
  return model.calibration === undefined
    ? raw
    : applyCalibration(model.calibration, raw);
}
