import {
  mergeEngagementSummaries,
  summarizeEngagements,
} from "@/lib/engagement-rollups";
import { expect, test } from "vitest";

test("summarizes wins, losses, evens, and winrate for our team", () => {
  const engagements = [
    { winner: "Alpha", zoneName: "Point" },
    { winner: "Alpha", zoneName: "Main" },
    { winner: "Bravo", zoneName: "Point" },
    { winner: null, zoneName: null },
  ];
  const summary = summarizeEngagements(engagements, "Alpha");
  expect(summary.total).toBe(4);
  expect(summary.won).toBe(2);
  expect(summary.lost).toBe(1);
  expect(summary.even).toBe(1);
  expect(summary.winratePercent).toBeCloseTo(66.67, 1);
  expect(summary.byZone).toContainEqual({
    zoneName: "Point",
    won: 1,
    lost: 1,
    even: 0,
  });
  expect(summary.byZone).toContainEqual({
    zoneName: "Main",
    won: 1,
    lost: 0,
    even: 0,
  });
});

test("winrate is null when there are no decisive engagements", () => {
  const summary = summarizeEngagements(
    [{ winner: null, zoneName: null }],
    "Alpha"
  );
  expect(summary.winratePercent).toBeNull();
});

test("mergeEngagementSummaries combines counts and recomputes winrate", () => {
  const a = summarizeEngagements(
    [{ winner: "Alpha", zoneName: "Point" }],
    "Alpha"
  );
  const b = summarizeEngagements(
    [{ winner: "Bravo", zoneName: "Point" }],
    "Alpha"
  );
  const merged = mergeEngagementSummaries([a, b]);
  expect(merged.total).toBe(2);
  expect(merged.won).toBe(1);
  expect(merged.lost).toBe(1);
  expect(merged.winratePercent).toBe(50);
  expect(merged.byZone).toContainEqual({
    zoneName: "Point",
    won: 1,
    lost: 1,
    even: 0,
  });
});
