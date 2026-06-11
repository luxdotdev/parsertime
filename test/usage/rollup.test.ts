import { describe, expect, it } from "vitest";
import {
  type RawEventRow,
  aggregateFeatureRollups,
  aggregatePageRollups,
  aggregateActiveUsers,
  dayKey,
} from "@/lib/usage/rollup";

const day = "2026-06-10";
const rows: RawEventRow[] = [
  { name: "scrim.create", environment: "PRODUCTION", userId: "u1", teamId: 1, path: null },
  { name: "scrim.create", environment: "PRODUCTION", userId: "u1", teamId: 1, path: null },
  { name: "scrim.create", environment: "PRODUCTION", userId: "u2", teamId: 2, path: null },
  { name: "page_view", environment: "PRODUCTION", userId: "u1", teamId: null, path: "/dashboard" },
  { name: "page_view", environment: "PRODUCTION", userId: "u2", teamId: null, path: "/dashboard" },
  { name: "page_view", environment: "PREVIEW", userId: "u9", teamId: null, path: "/dashboard" },
];

describe("dayKey", () => {
  it("formats a Date as YYYY-MM-DD", () => {
    expect(dayKey(new Date("2026-06-10T23:30:00.000Z"))).toBe("2026-06-10");
  });
});

describe("aggregateFeatureRollups", () => {
  it("counts total events and unique users/teams per (env, name)", () => {
    const result = aggregateFeatureRollups(rows, day);
    const prodScrim = result.find(
      (r) => r.environment === "PRODUCTION" && r.name === "scrim.create"
    );
    expect(prodScrim).toEqual({
      environment: "PRODUCTION",
      day,
      name: "scrim.create",
      totalEvents: 3,
      uniqueUsers: 2,
      uniqueTeams: 2,
    });
  });
  it("keeps environments separate", () => {
    const result = aggregateFeatureRollups(rows, day);
    const previewViews = result.find(
      (r) => r.environment === "PREVIEW" && r.name === "page_view"
    );
    expect(previewViews?.uniqueUsers).toBe(1);
  });
});

describe("aggregatePageRollups", () => {
  it("counts views and unique users per (env, path)", () => {
    const result = aggregatePageRollups(rows, day);
    const prod = result.find(
      (r) => r.environment === "PRODUCTION" && r.path === "/dashboard"
    );
    expect(prod).toEqual({
      environment: "PRODUCTION",
      day,
      path: "/dashboard",
      views: 2,
      uniqueUsers: 2,
    });
  });
});

describe("aggregateActiveUsers", () => {
  it("emits one (env, day, userId) row per active user", () => {
    const result = aggregateActiveUsers(rows, day);
    expect(result).toContainEqual({ environment: "PRODUCTION", day, userId: "u1" });
    expect(result).toContainEqual({ environment: "PRODUCTION", day, userId: "u2" });
    expect(result).toContainEqual({ environment: "PREVIEW", day, userId: "u9" });
    expect(result).toHaveLength(3);
  });
});
