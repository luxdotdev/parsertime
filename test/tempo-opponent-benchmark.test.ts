import {
  buildOpponentComparison,
  classifyOpponentDelta,
  isDefaultTeamName,
  OPPONENT_EVEN_THRESHOLD,
  type OpponentObservation,
} from "@/lib/tempo/opponent-benchmark";
import { expect, test } from "vitest";

test("returns null when there are no observations", () => {
  expect(buildOpponentComparison(154.6, [])).toBeNull();
});

test("pools the opponent mean and overall delta vs our value", () => {
  const obs: OpponentObservation[] = [
    { value: 160, name: "Falcons", mapId: 10 },
    { value: 156, name: "Falcons", mapId: 11 },
  ];
  const c = buildOpponentComparison(150, obs);
  expect(c?.opponentMean).toBeCloseTo(158, 5);
  expect(c?.delta).toBeCloseTo(-8, 5); // 150 - 158, we are faster
  expect(c?.mapsWithData).toBe(2);
});

test("groups by name with per-group mean, delta, and distinct map count", () => {
  const obs: OpponentObservation[] = [
    { value: 150, name: "Falcons", mapId: 10 },
    { value: 152, name: "Falcons", mapId: 10 }, // same map, two players
    { value: 158, name: "Falcons", mapId: 11 },
    { value: 170, name: "Raccoon", mapId: 12 },
  ];
  const c = buildOpponentComparison(155, obs);
  const falcons = c?.perOpponent.find((g) => g.name === "Falcons");
  expect(falcons?.mean).toBeCloseTo((150 + 152 + 158) / 3, 5);
  expect(falcons?.maps).toBe(2); // distinct mapIds 10 and 11
  expect(falcons?.delta).toBeCloseTo(155 - (150 + 152 + 158) / 3, 5);
});

test("collapses all null-name observations into one Unnamed group", () => {
  const obs: OpponentObservation[] = [
    { value: 160, name: null, mapId: 1 },
    { value: 158, name: null, mapId: 2 },
  ];
  const c = buildOpponentComparison(150, obs);
  const unnamed = c?.perOpponent.filter((g) => g.name === null) ?? [];
  expect(unnamed).toHaveLength(1);
  expect(unnamed[0].maps).toBe(2);
});

test("sorts named groups by maps desc, with the Unnamed group last", () => {
  const obs: OpponentObservation[] = [
    { value: 150, name: "A", mapId: 1 },
    { value: 150, name: "B", mapId: 2 },
    { value: 150, name: "B", mapId: 3 },
    { value: 150, name: null, mapId: 4 },
    { value: 150, name: null, mapId: 5 },
    { value: 150, name: null, mapId: 6 },
  ];
  const c = buildOpponentComparison(150, obs);
  expect(c?.perOpponent.map((g) => g.name)).toEqual(["B", "A", null]);
});

test("classifyOpponentDelta is faster/slower/even with a 1.0s band", () => {
  expect(OPPONENT_EVEN_THRESHOLD).toBe(1.0);
  expect(classifyOpponentDelta(-1.0)).toBe("faster");
  expect(classifyOpponentDelta(-5)).toBe("faster");
  expect(classifyOpponentDelta(1.0)).toBe("slower");
  expect(classifyOpponentDelta(3)).toBe("slower");
  expect(classifyOpponentDelta(0.5)).toBe("even");
  expect(classifyOpponentDelta(-0.9)).toBe("even");
});

test("isDefaultTeamName flags generic in-game team names only", () => {
  expect(isDefaultTeamName("Team 1")).toBe(true);
  expect(isDefaultTeamName("Team 2")).toBe(true);
  expect(isDefaultTeamName("team 2")).toBe(true);
  expect(isDefaultTeamName(" Team 3 ")).toBe(true);
  expect(isDefaultTeamName("Equipo 1")).toBe(true);
  expect(isDefaultTeamName("Spacestation Gaming")).toBe(false);
  expect(isDefaultTeamName("DSG")).toBe(false);
  expect(isDefaultTeamName("Team Falcons")).toBe(false);
});
