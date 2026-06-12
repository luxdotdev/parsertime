import { applyCalibration, fitCalibration } from "../calibration";
import { featureHash } from "../features";
import type { FamilyModel, ModelArtifact } from "../model";
import { type DatasetRow, MODE_FAMILIES, type ModeFamily } from "../types";
import { runGroupedCV } from "./cv";
import { fitLogisticRegression, standardize } from "./lr";
import { calibrationBins, checkGates, logLoss } from "./metrics";

export const MIN_FAMILY_ROWS = 5000;
export const FIT = { learningRate: 0.5, epochs: 300, l2: 1e-4 };

export type FamilyTrainResult = {
  model: FamilyModel | null;
  /** Human-readable lines: CV metrics, calibration tables, gate failures. */
  report: string[];
};

export function trainFamily(rows: DatasetRow[]): FamilyTrainResult {
  const report: string[] = [`rows: ${rows.length}`];
  if (rows.length < MIN_FAMILY_ROWS) {
    report.push(`below MIN_FAMILY_ROWS (${MIN_FAMILY_ROWS}) — family disabled`);
    return { model: null, report };
  }

  const cv = runGroupedCV(rows, 5, FIT);
  report.push(
    `CV log loss ${cv.pooled.logLoss.toFixed(4)}, Brier ${cv.pooled.brier.toFixed(4)}, base rate ${cv.pooled.baseRate.toFixed(3)}`
  );
  report.push("raw calibration (bins with n>0):");
  for (const bin of cv.pooled.bins) {
    if (bin.n === 0) continue;
    report.push(
      `  [${bin.lo.toFixed(1)},${bin.hi.toFixed(1)}) pred ${bin.meanPred.toFixed(3)} obs ${bin.meanLabel.toFixed(3)} n=${bin.n}`
    );
  }

  // Isotonic recalibration fitted on the held-out CV predictions; the gates
  // judge the calibrated outputs — what the product will actually display.
  const calibration = fitCalibration(cv.pooled.preds, cv.pooled.labels);
  const calibratedPreds = cv.pooled.preds.map((p) =>
    applyCalibration(calibration, p)
  );
  const calibratedLogLoss = logLoss(calibratedPreds, cv.pooled.labels);
  const calibratedBinList = calibrationBins(
    calibratedPreds,
    cv.pooled.labels,
    10
  );
  report.push(`calibrated log loss ${calibratedLogLoss.toFixed(4)}:`);
  for (const bin of calibratedBinList) {
    if (bin.n === 0) continue;
    report.push(
      `  [${bin.lo.toFixed(1)},${bin.hi.toFixed(1)}) pred ${bin.meanPred.toFixed(3)} obs ${bin.meanLabel.toFixed(3)} n=${bin.n}`
    );
  }

  const gates = checkGates({
    logLoss: calibratedLogLoss,
    baseRate: cv.pooled.baseRate,
    bins: calibratedBinList,
  });
  if (!gates.pass) {
    for (const failure of gates.failures) report.push(`GATE FAIL: ${failure}`);
    return { model: null, report };
  }

  const { Xs, means, stds } = standardize(rows.map((r) => r.features));
  const { weights, bias } = fitLogisticRegression(
    Xs,
    rows.map((r) => r.label),
    FIT
  );
  return {
    model: {
      weights,
      bias,
      means,
      stds,
      sampleCount: rows.length,
      calibration,
      metrics: {
        logLoss: calibratedLogLoss,
        brier: cv.pooled.brier,
        baseRate: cv.pooled.baseRate,
      },
    },
    report,
  };
}

export type ArtifactBuildResult = {
  artifact: ModelArtifact;
  reports: Record<ModeFamily, string[]>;
  trainedFamilies: ModeFamily[];
};

export function buildArtifact(
  rowsByFamily: Record<ModeFamily, DatasetRow[]>,
  modelVersion: number
): ArtifactBuildResult {
  const modeFamilies: ModelArtifact["modeFamilies"] = {
    control: null,
    escort_hybrid: null,
    push: null,
    flashpoint: null,
  };
  const reports: Record<ModeFamily, string[]> = {
    control: [],
    escort_hybrid: [],
    push: [],
    flashpoint: [],
  };
  for (const family of MODE_FAMILIES) {
    const result = trainFamily(rowsByFamily[family]);
    modeFamilies[family] = result.model;
    reports[family] = result.report;
  }
  return {
    artifact: {
      schemaVersion: 1,
      modelVersion,
      createdAt: new Date().toISOString(),
      featureHash: featureHash(),
      modeFamilies,
    },
    reports,
    trainedFamilies: MODE_FAMILIES.filter((f) => modeFamilies[f] !== null),
  };
}
