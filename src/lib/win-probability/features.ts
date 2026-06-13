import { createHash } from "node:crypto";
import type { GameState } from "./types";

/** Order is the model contract. NEVER reorder or rename without retraining —
 * the artifact's featureHash will (correctly) refuse to load otherwise. */
export const FEATURE_NAMES = [
  "tankAliveDiff",
  "dpsAliveDiff",
  "supportAliveDiff",
  "tankUltDiff",
  "dpsUltDiff",
  "supportUltDiff",
  "scoreDiff",
  "timeRemainingNorm",
  "objProgressOwn",
  "objProgressEnemy",
  "isAttacker",
  "controlProgressOwn",
  "controlProgressEnemy",
  "holdsObjective",
  "roundNumberNorm",
  "isOvertime",
  "objectiveIndexNorm",
  "aliveDiff_x_objMax",
  "aliveDiff_x_controlMax",
  "ultBankDiff_x_timeRemaining",
  "scoreDiff_x_roundNumber",
] as const;

const TIME_NORM_SECONDS = 600;
const ROUND_NORM = 4;
// Per-mode models share this formula: escort/hybrid checkpoint indices and
// flashpoint point numbers both live in 0..4ish; coefficients are per-mode
// anyway, so a uniform normalizer is fine. Unknown (null) degrades to 0.
const OBJECTIVE_INDEX_NORM = 4;

export function extractFeatures(s: GameState): number[] {
  const timeRemainingNorm = Math.min(1, s.timeRemaining / TIME_NORM_SECONDS);
  const objMax = Math.max(s.objProgressOwn, s.objProgressEnemy);
  const controlMax = Math.max(s.controlProgressOwn, s.controlProgressEnemy);
  // Round context: a small deficit in a late round reads differently from an
  // early blowout — the interaction lets the model weigh score by phase.
  const roundNumberNorm = Math.min(s.roundNumber, ROUND_NORM) / ROUND_NORM;
  const objectiveIndexNorm =
    s.objectiveIndex === null
      ? 0
      : Math.min(Math.max(s.objectiveIndex, 0), OBJECTIVE_INDEX_NORM) /
        OBJECTIVE_INDEX_NORM;
  // Interactions deliberately use the aggregate sums (aliveDiff, ultBankDiff)
  // rather than role splits — the splits carry the role signal; tripling the
  // interaction count would only add collinearity.
  return [
    s.tankAliveDiff,
    s.dpsAliveDiff,
    s.supportAliveDiff,
    s.tankUltDiff,
    s.dpsUltDiff,
    s.supportUltDiff,
    s.scoreDiff,
    timeRemainingNorm,
    s.objProgressOwn,
    s.objProgressEnemy,
    s.isAttacker,
    s.controlProgressOwn,
    s.controlProgressEnemy,
    s.holdsObjective,
    roundNumberNorm,
    s.isOvertime,
    objectiveIndexNorm,
    s.aliveDiff * objMax,
    s.aliveDiff * controlMax,
    s.ultBankDiff * timeRemainingNorm,
    s.scoreDiff * roundNumberNorm,
  ];
}

export function featureHash(): string {
  return createHash("sha256")
    .update(FEATURE_NAMES.join("|"))
    .digest("hex")
    .slice(0, 12);
}
