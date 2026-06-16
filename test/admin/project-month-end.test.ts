import { describe, expect, it } from "vitest";
import { projectMonthEnd } from "@/lib/admin/project-month-end";

describe("projectMonthEnd", () => {
  it("projects via linear run-rate mid-month", () => {
    // June 2026 has 30 days; day 10 => fraction 1/3 => 100 actual projects to 300
    const r = projectMonthEnd(100, new Date(2026, 5, 10));
    expect(r.projectedTotal).toBe(300);
    expect(r.projectedDelta).toBe(200);
    expect(r.fraction).toBeCloseTo(10 / 30);
  });

  it("returns zero delta on the last day of the month", () => {
    const r = projectMonthEnd(200, new Date(2026, 5, 30)); // June 30 = last day
    expect(r.projectedDelta).toBe(0);
    expect(r.projectedTotal).toBe(200);
  });

  it("returns zero delta when actual is zero", () => {
    const r = projectMonthEnd(0, new Date(2026, 5, 10));
    expect(r.projectedDelta).toBe(0);
    expect(r.projectedTotal).toBe(0);
  });

  it("never returns a negative delta", () => {
    const r = projectMonthEnd(5, new Date(2026, 5, 1)); // day 1 of 30
    expect(r.projectedDelta).toBeGreaterThanOrEqual(0);
    expect(r.projectedTotal).toBeGreaterThanOrEqual(5);
  });
});
