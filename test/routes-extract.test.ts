import { extractRoutes, type RouteSample } from "@/lib/routes/extract";
import { expect, test } from "vitest";

function sample(o: Partial<RouteSample> = {}): RouteSample {
  return {
    t: 0,
    playerName: "lux",
    playerTeam: "Team 1",
    x: 0,
    z: 0,
    ...o,
  };
}

function walk(n: number, t0: number, name = "lux") {
  return Array.from({ length: n }, (_, i) =>
    sample({ t: t0 + i, x: i * 2, playerName: name })
  );
}

const roundStarts = [{ t: 0, roundNumber: 1 }];

test("an INITIAL route runs from round start to first contact", () => {
  const samples = walk(10, 0);
  const contacts = [{ t: 8, players: ["lux"] }];
  const routes = extractRoutes(samples, contacts, [], roundStarts, 100);
  expect(routes).toHaveLength(1);
  expect(routes[0].kind).toBe("INITIAL");
  expect(routes[0].points).toHaveLength(9);
  expect(routes[0].endT).toBe(8);
});

test("a death splits the timeline: respawn route is tagged RESPAWN", () => {
  const firstLife = walk(6, 0);
  const secondLife = walk(8, 20);
  const contacts = [
    { t: 5, players: ["lux"] },
    { t: 26, players: ["lux"] },
  ];
  const deaths = [{ t: 6, playerName: "lux" }];
  const routes = extractRoutes(
    [...firstLife, ...secondLife],
    contacts,
    deaths,
    roundStarts,
    100
  );
  expect(routes).toHaveLength(2);
  expect(routes[0].kind).toBe("INITIAL");
  expect(routes[1].kind).toBe("RESPAWN");
  expect(routes[1].startT).toBeGreaterThanOrEqual(20);
});

test("a life with no contact produces no route", () => {
  const samples = walk(10, 0);
  expect(extractRoutes(samples, [], [], roundStarts, 100)).toHaveLength(0);
});

test("routes below the length quality bar are dropped", () => {
  const samples = Array.from({ length: 5 }, (_, i) => sample({ t: i }));
  const contacts = [{ t: 4, players: ["lux"] }];
  expect(extractRoutes(samples, contacts, [], roundStarts, 100)).toHaveLength(0);
});

test("contact by another player does not end the route", () => {
  const samples = walk(10, 0);
  const contacts = [
    { t: 3, players: ["someone-else"] },
    { t: 8, players: ["lux"] },
  ];
  const routes = extractRoutes(samples, contacts, [], roundStarts, 100);
  expect(routes[0].endT).toBe(8);
});

test("round number is taken from the containing round", () => {
  const twoRounds = [
    { t: 0, roundNumber: 1 },
    { t: 100, roundNumber: 2 },
  ];
  const samples = walk(10, 100);
  const contacts = [{ t: 108, players: ["lux"] }];
  const routes = extractRoutes(samples, contacts, [], twoRounds, 200);
  expect(routes[0].roundNumber).toBe(2);
});
