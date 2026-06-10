import {
  clusterEngagements,
  type EngagementEvent,
} from "@/lib/engagements";
import { expect, test } from "vitest";

function ev(o: Partial<EngagementEvent> = {}): EngagementEvent {
  return {
    match_time: 100,
    x: 0,
    z: 0,
    kind: "damage",
    attackerTeam: "Team 1",
    attackerName: "a1",
    victimTeam: "Team 2",
    victimName: "v1",
    ...o,
  };
}

function burst(n: number, t: number, cx: number, cz: number, o: Partial<EngagementEvent> = {}) {
  return Array.from({ length: n }, (_, i) =>
    ev({ match_time: t + i, x: cx + (i % 3), z: cz + (i % 2), ...o })
  );
}

test("two simultaneous fights on opposite flanks split into two engagements", () => {
  const events = [
    ...burst(10, 100, 0, 0),
    ...burst(10, 100, 200, 0),
    ev({ match_time: 104, x: 1, z: 1, kind: "kill" }),
    ev({ match_time: 104, x: 201, z: 1, kind: "kill" }),
  ];
  const engagements = clusterEngagements(events);
  expect(engagements).toHaveLength(2);
});

test("a continuous drifting fight stays one engagement", () => {
  const events = Array.from({ length: 60 }, (_, i) =>
    ev({ match_time: 100 + i, x: i * 2, z: 0, kind: i === 30 ? "kill" : "damage" })
  );
  expect(clusterEngagements(events)).toHaveLength(1);
});

test("clusters without a kill are dropped", () => {
  const events = burst(10, 100, 0, 0);
  expect(clusterEngagements(events)).toHaveLength(0);
});

test("sparse events form no engagement", () => {
  const events = [
    ev({ match_time: 100, kind: "kill" }),
    ev({ match_time: 200, kind: "kill" }),
  ];
  expect(clusterEngagements(events)).toHaveLength(0);
});

test("winner is the team with more kills; tie is null", () => {
  const base = burst(8, 100, 0, 0);
  const oneSided = clusterEngagements([
    ...base,
    ev({ match_time: 104, kind: "kill", attackerTeam: "Team 1" }),
    ev({ match_time: 105, kind: "kill", attackerTeam: "Team 1" }),
    ev({ match_time: 106, kind: "kill", attackerTeam: "Team 2" }),
  ]);
  expect(oneSided[0].winner).toBe("Team 1");
  expect(oneSided[0].killsByTeam).toEqual({ "Team 1": 2, "Team 2": 1 });

  const tied = clusterEngagements([
    ...base,
    ev({ match_time: 104, kind: "kill", attackerTeam: "Team 1" }),
    ev({ match_time: 105, kind: "kill", attackerTeam: "Team 2" }),
  ]);
  expect(tied[0].winner).toBeNull();
});

test("engagement records time bounds, centroid, and participants", () => {
  const events = [
    ...burst(8, 100, 10, 10, { attackerName: "a1", victimName: "v1" }),
    ev({ match_time: 109, x: 12, z: 10, kind: "kill", attackerName: "a2", victimName: "v2" }),
  ];
  const [e] = clusterEngagements(events);
  expect(e.start).toBe(100);
  expect(e.end).toBe(109);
  expect(Math.abs(e.centroid.x - 11)).toBeLessThan(3);
  expect(e.participants).toEqual(
    expect.arrayContaining(["a1", "v1", "a2", "v2"])
  );
});
