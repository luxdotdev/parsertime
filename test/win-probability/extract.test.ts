import {
  buildRows,
  fightBoundaries,
  roundLabels,
  snapshotTimes,
} from "@/lib/win-probability/training/extract";
import type { WPEventLog } from "@/lib/win-probability/types";
import { describe, expect, test } from "vitest";

const round = {
  roundNumber: 1,
  start: 0,
  end: 30,
  capturingTeam: "Alpha",
  startScore1: 0,
  startScore2: 0,
  endScore1: 1,
  endScore2: 0,
};

function log(overrides: Partial<WPEventLog> = {}): WPEventLog {
  return {
    modeFamily: "control",
    team1: "Alpha",
    team2: "Bravo",
    kills: [],
    rezzes: [],
    ultCharged: [],
    ultStart: [],
    rounds: [round],
    progress: [],
    objectiveCaptured: [],
    setupCompletes: [],
    ...overrides,
  };
}

describe("fightBoundaries", () => {
  test("clusters kills separated by more than the gap into separate fights", () => {
    const kills = [{ time: 10 }, { time: 12 }, { time: 50 }];
    expect(fightBoundaries(kills, 15)).toEqual([
      { start: 10, end: 12 },
      { start: 50, end: 50 },
    ]);
  });
});

describe("snapshotTimes", () => {
  test("emits the 5s grid within the round plus fight boundaries, deduped and sorted", () => {
    const times = snapshotTimes([round], [{ start: 7, end: 12 }]);
    expect(times).toEqual([0, 5, 7, 10, 12, 15, 20, 25, 30]);
  });
});

describe("roundLabels", () => {
  test("control: round winner from score delta", () => {
    const labels = roundLabels(log());
    expect(labels.get(1)).toBe("Alpha");
  });

  test("non-control: map winner from final score, applied to every round", () => {
    const l = log({ modeFamily: "push" });
    expect(roundLabels(l).get(1)).toBe("Alpha");
  });

  test("non-control score tie → null labels (map skipped)", () => {
    const tied = log({
      modeFamily: "escort_hybrid",
      rounds: [{ ...round, endScore1: 2, endScore2: 2 }],
    });
    expect(roundLabels(tied).get(1)).toBeNull();
  });
});

describe("buildRows", () => {
  test("two mirrored rows per snapshot with complementary labels", () => {
    const rows = buildRows(log(), 77);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length % 2).toBe(0);
    const [a, b] = rows;
    expect(a.matchId).toBe(77);
    expect(a.label + b.label).toBe(1);
    expect(a.features[0]).toBe(-b.features[0]); // aliveDiff mirrors
  });

  test("rounds with null labels produce no rows", () => {
    const tied = log({
      modeFamily: "escort_hybrid",
      rounds: [{ ...round, endScore1: 2, endScore2: 2 }],
    });
    expect(buildRows(tied, 77)).toEqual([]);
  });
});
