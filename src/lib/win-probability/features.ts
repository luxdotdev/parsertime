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
  "aliveDiff_x_objMax",
  "ultBankDiff_x_timeRemaining",
] as const;

const TIME_NORM_SECONDS = 600;

export function extractFeatures(s: GameState): number[] {
  const timeRemainingNorm = Math.min(1, s.timeRemaining / TIME_NORM_SECONDS);
  const objMax = Math.max(s.objProgressOwn, s.objProgressEnemy);
  return [
    s.aliveDiff,
    s.ultBankDiff,
    s.scoreDiff,
    timeRemainingNorm,
    s.objProgressOwn,
    s.objProgressEnemy,
    s.isAttacker,
    s.aliveDiff * objMax,
    s.ultBankDiff * timeRemainingNorm,
  ];
}

export function featureHash(): string {
  return createHash("sha256")
    .update(FEATURE_NAMES.join("|"))
    .digest("hex")
    .slice(0, 12);
}
