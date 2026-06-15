import type { FamilyModel } from "@/lib/win-probability/model";
import { chooseFamily } from "@/lib/win-probability/training/champion-challenger";
import { expect, test } from "vitest";

function gbm(logLoss: number): FamilyModel {
  return {
    kind: "gbm",
    trees: [],
    baseScore: 0,
    sampleCount: 1,
    metrics: { logLoss, brier: 0.2, baseRate: 0.5 },
  };
}

test("ships the challenger when gated and strictly better than the incumbent", () => {
  const challenger = gbm(0.5);
  const incumbent = gbm(0.6);
  expect(chooseFamily(challenger, true, incumbent)).toBe(challenger);
});

test("keeps the incumbent when the challenger is worse", () => {
  const challenger = gbm(0.7);
  const incumbent = gbm(0.6);
  expect(chooseFamily(challenger, true, incumbent)).toBe(incumbent);
});

test("keeps the incumbent when the challenger fails the gate", () => {
  const challenger = gbm(0.4);
  const incumbent = gbm(0.6);
  expect(chooseFamily(challenger, false, incumbent)).toBe(incumbent);
});

test("ships the gated challenger when there is no incumbent", () => {
  const challenger = gbm(0.5);
  expect(chooseFamily(challenger, true, null)).toBe(challenger);
});

test("ships the challenger when the gate fails but there is no incumbent", () => {
  const challenger = gbm(0.5);
  expect(chooseFamily(challenger, false, null)).toBe(challenger);
});

test("returns the incumbent when the challenger is null", () => {
  const incumbent = gbm(0.6);
  expect(chooseFamily(null, false, incumbent)).toBe(incumbent);
});

test("returns null when both challenger and incumbent are null", () => {
  expect(chooseFamily(null, true, null)).toBeNull();
});
