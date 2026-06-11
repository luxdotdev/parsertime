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
  expect(extractRoutes(samples, contacts, [], roundStarts, 100)).toHaveLength(
    0
  );
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

test("the killing blow does not end the respawn route it starts", () => {
  const firstLife = walk(6, 0); // t=0..5
  const deathSample = sample({ t: 6, x: 10 }); // victim position at the kill
  const respawnWalk = walk(8, 20); // t=20..27 after respawn
  const contacts = [
    { t: 5, players: ["lux"] }, // ends the first life
    { t: 6, players: ["enemy", "lux"] }, // the killing blow itself
    { t: 26, players: ["lux"] }, // real first contact after respawn
  ];
  const deaths = [{ t: 6, playerName: "lux" }];
  const routes = extractRoutes(
    [...firstLife, deathSample, ...respawnWalk],
    contacts,
    deaths,
    roundStarts,
    100
  );
  const respawn = routes.find((r) => r.kind === "RESPAWN");
  expect(respawn).toBeDefined();
  expect(respawn!.startT).toBe(20); // anchored at first post-death sample
  expect(respawn!.endT).toBe(26);
});

test("a long sample gap keeps only the final contiguous segment", () => {
  // two spawn casts, 15s of unsampled travel, then a dense approach
  const spawnCasts = [sample({ t: 0, x: 0 }), sample({ t: 2, x: 4 })];
  const approach = Array.from({ length: 8 }, (_, i) =>
    sample({ t: 17 + i, x: 100 + i * 3 })
  );
  const contacts = [{ t: 24, players: ["lux"] }];
  const routes = extractRoutes(
    [...spawnCasts, ...approach],
    contacts,
    [],
    roundStarts,
    100
  );
  expect(routes).toHaveLength(1);
  expect(routes[0].startT).toBe(17); // gap segment dropped, no invented line
  expect(routes[0].points[0].x).toBe(100);
});

test("a teleport-scale jump splits the route even within the time window", () => {
  const before = [
    sample({ t: 0, x: 0 }),
    sample({ t: 1, x: 2 }),
    sample({ t: 2, x: 4 }),
  ];
  const after = Array.from({ length: 6 }, (_, i) =>
    sample({ t: 4 + i, x: 200 + i * 3 })
  );
  const contacts = [{ t: 9, players: ["lux"] }];
  const routes = extractRoutes(
    [...before, ...after],
    contacts,
    [],
    roundStarts,
    100
  );
  expect(routes).toHaveLength(1);
  expect(routes[0].points[0].x).toBe(200); // 196m jump never rendered
});

test("a route whose final segment fails the bars is dropped entirely", () => {
  // dense early walk, long gap, only two samples at the contact
  const early = walk(8, 0); // t=0..7
  const late = [sample({ t: 30, x: 100 }), sample({ t: 31, x: 101 })];
  const contacts = [{ t: 31, players: ["lux"] }];
  const routes = extractRoutes(
    [...early, ...late],
    contacts,
    [],
    roundStarts,
    100
  );
  expect(routes).toHaveLength(0); // early segment doesn't reach the contact
});
