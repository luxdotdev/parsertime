import {
  buildObjectivePeriods,
  objectivePeriodOutcomes,
} from "@/lib/routes/objective-outcome";
import { expect, test } from "vitest";

// Shapes mirror real Flashpoint data: transitions carry the NEW round's
// number; captures flip between teams during contention and the last
// non-neutral capture decides the flashpoint.
const transitions = [
  { t: 196, roundNumber: 2 },
  { t: 378, roundNumber: 3 },
  { t: 540, roundNumber: 4 },
];

test("periods derive from transitions, including the initial period", () => {
  const periods = buildObjectivePeriods(transitions, 700);
  expect(periods).toEqual([
    { start: 0, end: 196, roundNumber: 1 },
    { start: 196, end: 378, roundNumber: 2 },
    { start: 378, end: 540, roundNumber: 3 },
    { start: 540, end: 700, roundNumber: 4 },
  ]);
});

test("period winner is the last non-neutral capture in the window", () => {
  const captures = [
    { t: 41, capturingTeam: "Team 1" },
    { t: 70, capturingTeam: "Team 2" },
    { t: 147, capturingTeam: "Team 1" }, // last in round 1 → Team 1
    { t: 196, capturingTeam: "All Teams" }, // neutral marker, ignored
    { t: 248, capturingTeam: "Team 2" }, // only real capture in round 2
  ];
  const outcomes = objectivePeriodOutcomes(
    buildObjectivePeriods(transitions, 700),
    captures
  );
  expect(outcomes.get(1)).toBe("Team 1");
  expect(outcomes.get(2)).toBe("Team 2");
  expect(outcomes.get(3)).toBeNull(); // no captures → unknown
});

test("no transitions yields no periods or outcomes", () => {
  expect(buildObjectivePeriods([], 700)).toEqual([]);
  expect(
    objectivePeriodOutcomes([], [{ t: 1, capturingTeam: "Team 1" }]).size
  ).toBe(0);
});
