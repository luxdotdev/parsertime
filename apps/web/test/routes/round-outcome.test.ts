import { roundOutcomes } from "@/lib/routes/round-outcome";
import { expect, test } from "vitest";

test("the team whose score increases wins the round", () => {
  const outcomes = roundOutcomes(
    [
      { roundNumber: 1, team1Score: 1, team2Score: 0 },
      { roundNumber: 2, team1Score: 1, team2Score: 1 },
      { roundNumber: 3, team1Score: 2, team2Score: 1 },
    ],
    "Alpha",
    "Bravo"
  );
  expect(outcomes.get(1)).toBe("Alpha");
  expect(outcomes.get(2)).toBe("Bravo");
  expect(outcomes.get(3)).toBe("Alpha");
});

test("no score change or both changing yields null", () => {
  const outcomes = roundOutcomes(
    [
      { roundNumber: 1, team1Score: 0, team2Score: 0 },
      { roundNumber: 2, team1Score: 1, team2Score: 1 },
    ],
    "Alpha",
    "Bravo"
  );
  expect(outcomes.get(1)).toBeNull();
  expect(outcomes.get(2)).toBeNull();
});

test("duplicate RoundEnd rows for a round use the last row", () => {
  const outcomes = roundOutcomes(
    [
      { roundNumber: 1, team1Score: 0, team2Score: 0 },
      { roundNumber: 1, team1Score: 1, team2Score: 0 },
    ],
    "Alpha",
    "Bravo"
  );
  expect(outcomes.get(1)).toBe("Alpha");
});
