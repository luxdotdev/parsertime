import { createHash } from "node:crypto";
import type { GameState } from "./types";

/** Order is the model contract. NEVER reorder or rename without retraining —
 * the artifact's featureHash will (correctly) refuse to load otherwise. */
export const FEATURE_NAMES = [
  "aliveDiff",
  "ultBankDiff",
  "scoreDiff",
  "timeRemainingNorm",
  "objProgressOwn",
  "objProgressEnemy",
  "isAttacker",
  "controlProgressOwn",
  "controlProgressEnemy",
  "holdsObjective",
  "roundNumberNorm",
  "aliveDiff_x_objMax",
  "aliveDiff_x_controlMax",
  "ultBankDiff_x_timeRemaining",
  "scoreDiff_x_roundNumber",
] as const;

const TIME_NORM_SECONDS = 600;
const ROUND_NORM = 4;

export function extractFeatures(s: GameState): number[] {
  const timeRemainingNorm = Math.min(1, s.timeRemaining / TIME_NORM_SECONDS);
  const objMax = Math.max(s.objProgressOwn, s.objProgressEnemy);
  const controlMax = Math.max(s.controlProgressOwn, s.controlProgressEnemy);
  // Round context: a small deficit in a late round reads differently from an
  // early blowout — the interaction lets the model weigh score by phase.
  const roundNumberNorm = Math.min(s.roundNumber, ROUND_NORM) / ROUND_NORM;
  return [
    s.aliveDiff,
    s.ultBankDiff,
    s.scoreDiff,
    timeRemainingNorm,
    s.objProgressOwn,
    s.objProgressEnemy,
    s.isAttacker,
    s.controlProgressOwn,
    s.controlProgressEnemy,
    s.holdsObjective,
    roundNumberNorm,
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
