import { describe, expect, test } from "vitest";
import type { FightInitiationLabel } from "@/lib/fight-initiation";
import {
  emptyTally,
  initiationRates,
  mergeTallies,
  tallyMapForTeam,
} from "@/lib/fight-initiation-rollups";
import { round } from "@/lib/utils";

function label(over: Partial<FightInitiationLabel>): FightInitiationLabel {
  return {
    fightIndex: 0,
    start: 0,
    initiator: "Us",
    contested: false,
    winner: "Us",
    initiatorWon: true,
    firstBloodTeam: "Us",
    confidence: "high",
    responseGap: 2,
    evidence: {
      players: [],
      damage: 0,
      usedUlt: false,
      abilityCommit: false,
      healing: "neutral",
      firstBloodTeam: "Us",
      fallback: false,
    },
    ...over,
  };
}

describe("tallyMapForTeam", () => {
  test("buckets fights into went-first / went-second relative to our team", () => {
    const labels = [
      label({ initiator: "Us", winner: "Us" }), // first, win
      label({ initiator: "Us", winner: "Them" }), // first, loss
      label({ initiator: "Them", winner: "Us" }), // second, win
      label({ initiator: "Them", winner: "Them" }), // second, loss
      label({ initiator: null, contested: true, winner: null }), // contested
    ];
    const t = tallyMapForTeam(labels, "Us");
    expect(t.totalFights).toBe(5);
    expect(t.contestedFights).toBe(1);
    expect(t.decidedFights).toBe(4);
    expect(t.wentFirst).toBe(2);
    expect(t.wentFirstWins).toBe(1);
    expect(t.wentSecond).toBe(2);
    expect(t.wentSecondWins).toBe(1);
    expect(t.mapsCovered).toBe(1);
  });
});

describe("mergeTallies + initiationRates", () => {
  test("merges per-map tallies and derives rates", () => {
    const a = tallyMapForTeam(
      [
        label({ initiator: "Us", winner: "Us" }),
        label({ initiator: "Us", winner: "Them" }),
      ],
      "Us"
    );
    const b = tallyMapForTeam(
      [
        label({ initiator: "Them", winner: "Us" }),
        label({ initiator: "Us", winner: "Us" }),
      ],
      "Us"
    );
    const merged = mergeTallies([a, b]);
    expect(merged.mapsCovered).toBe(2);
    expect(merged.wentFirst).toBe(3);
    expect(merged.wentFirstWins).toBe(2);
    expect(merged.wentSecond).toBe(1);
    expect(merged.wentSecondWins).toBe(1);
    expect(merged.decidedFights).toBe(4);

    const rates = initiationRates(merged);
    expect(rates.initiationWinrate).toBe(round((2 / 3) * 100)); // win when going first
    expect(rates.initiationFrequency).toBe(round((3 / 4) * 100)); // share of decided fights we initiated
    expect(rates.goingSecondWinrate).toBe(100); // 1/1
  });

  test("empty tally yields zero rates without dividing by zero", () => {
    const rates = initiationRates(emptyTally());
    expect(rates.initiationWinrate).toBe(0);
    expect(rates.initiationFrequency).toBe(0);
    expect(rates.goingSecondWinrate).toBe(0);
  });
});
