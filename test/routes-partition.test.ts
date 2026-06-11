import { describe, expect, it } from "vitest";
import {
  partitionRoutesByObjective,
  resolveObjectiveIndex,
} from "@/lib/routes/partition";
import type { Route } from "@/lib/routes/extract";

const rounds = [
  { match_time: 0, objective_index: 0 },
  { match_time: 100, objective_index: 1 },
  { match_time: 200, objective_index: 2 },
];

function routeAt(startT: number): Route {
  return {
    playerName: "p",
    playerTeam: "A",
    roundNumber: 1,
    kind: "INITIAL",
    startT,
    endT: startT + 5,
    points: [
      { x: 0, z: 0 },
      { x: 1, z: 1 },
    ],
  };
}

describe("resolveObjectiveIndex", () => {
  it("returns the index of the last round start at or before t", () => {
    expect(resolveObjectiveIndex(0, rounds)).toBe(0);
    expect(resolveObjectiveIndex(150, rounds)).toBe(1);
    expect(resolveObjectiveIndex(999, rounds)).toBe(2);
  });

  it("returns null before the first round start", () => {
    expect(resolveObjectiveIndex(-1, rounds)).toBeNull();
  });

  it("is order-independent", () => {
    const shuffled = [rounds[2], rounds[0], rounds[1]];
    expect(resolveObjectiveIndex(150, shuffled)).toBe(1);
  });
});

describe("partitionRoutesByObjective", () => {
  it("groups routes by the objective active at their startT", () => {
    const routes = [routeAt(10), routeAt(120), routeAt(130), routeAt(250)];
    const byIndex = partitionRoutesByObjective(routes, rounds);
    expect(byIndex.get(0)).toHaveLength(1);
    expect(byIndex.get(1)).toHaveLength(2);
    expect(byIndex.get(2)).toHaveLength(1);
  });

  it("drops routes that start before any round", () => {
    const byIndex = partitionRoutesByObjective([routeAt(-5)], rounds);
    expect(byIndex.size).toBe(0);
  });
});
