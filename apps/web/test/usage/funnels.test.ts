import { describe, expect, it } from "vitest";
import { computeFunnel, type FunnelEventRow } from "@/lib/usage/funnels";

// userId, ordered list of (name) they performed (ts ordering pre-applied)
const rows: FunnelEventRow[] = [
  { userId: "u1", name: "auth.signup" },
  { userId: "u1", name: "team.create" },
  { userId: "u1", name: "scrim.create" },
  { userId: "u1", name: "stats.view" },
  { userId: "u2", name: "auth.signup" },
  { userId: "u2", name: "team.create" },
  { userId: "u3", name: "auth.signup" },
];

describe("computeFunnel", () => {
  const steps = ["auth.signup", "team.create", "scrim.create", "stats.view"];

  it("counts users reaching each step (monotonic non-increasing)", () => {
    const result = computeFunnel(rows, steps);
    expect(result.map((s) => s.users)).toEqual([3, 2, 1, 1]);
  });

  it("reports per-step conversion from the previous step", () => {
    const result = computeFunnel(rows, steps);
    expect(result[0]?.conversion).toBe(1); // first step baseline
    expect(result[1]?.conversion).toBeCloseTo(2 / 3);
    expect(result[2]?.conversion).toBeCloseTo(1 / 2);
  });

  it("requires steps in order — a later step without an earlier one doesn't count", () => {
    const onlyLate: FunnelEventRow[] = [{ userId: "x", name: "stats.view" }];
    const result = computeFunnel(onlyLate, steps);
    expect(result.map((s) => s.users)).toEqual([0, 0, 0, 0]);
  });
});
