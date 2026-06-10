import {
  aggregateStatsByPlayer,
  buildStatTrends,
  POSITIONAL_STAT_TYPES,
} from "@/lib/positional-rollups";
import { expect, test } from "vitest";

test("POSITIONAL_STAT_TYPES is the union of spatial and ult types", () => {
  expect(POSITIONAL_STAT_TYPES).toHaveLength(8);
  expect(POSITIONAL_STAT_TYPES).toContain("AVERAGE_ENGAGEMENT_DISTANCE");
  expect(POSITIONAL_STAT_TYPES).toContain("ULTS_ON_OBJECTIVE_PERCENTAGE");
});

test("aggregateStatsByPlayer averages per player and stat", () => {
  const rows = [
    { playerName: "lux", stat: "ULT_DEATH_PERCENTAGE", value: 20 },
    { playerName: "lux", stat: "ULT_DEATH_PERCENTAGE", value: 40 },
    { playerName: "lux", stat: "AVERAGE_ENGAGEMENT_DISTANCE", value: 12 },
    { playerName: "kai", stat: "ULT_DEATH_PERCENTAGE", value: 10 },
  ];
  const result = aggregateStatsByPlayer(rows);
  expect(result.get("lux")?.get("ULT_DEATH_PERCENTAGE")).toBe(30);
  expect(result.get("lux")?.get("AVERAGE_ENGAGEMENT_DISTANCE")).toBe(12);
  expect(result.get("kai")?.get("ULT_DEATH_PERCENTAGE")).toBe(10);
  expect(result.get("kai")?.has("AVERAGE_ENGAGEMENT_DISTANCE")).toBe(false);
});

test("buildStatTrends produces per-scrim averages ordered by date", () => {
  const rows = [
    { stat: "ULT_DEATH_PERCENTAGE", value: 20, scrimId: 1, scrimDate: new Date("2026-06-01") },
    { stat: "ULT_DEATH_PERCENTAGE", value: 40, scrimId: 1, scrimDate: new Date("2026-06-01") },
    { stat: "ULT_DEATH_PERCENTAGE", value: 10, scrimId: 2, scrimDate: new Date("2026-06-08") },
  ];
  const trends = buildStatTrends(rows);
  expect(trends.get("ULT_DEATH_PERCENTAGE")).toEqual([
    { scrimId: 1, date: new Date("2026-06-01"), value: 30 },
    { scrimId: 2, date: new Date("2026-06-08"), value: 10 },
  ]);
  expect(trends.has("AVERAGE_ENGAGEMENT_DISTANCE")).toBe(false);
});
