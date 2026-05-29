import {
  aggregateComputed,
  type ComputedRow,
} from "@/lib/query-builder/aggregate";
import { querySpecSchema, type QuerySpec } from "@/lib/query-builder/types";
import { describe, expect, it } from "vitest";

const ABILITY_TIMING_ROWS: ComputedRow[] = [
  {
    won: 1,
    result: "win",
    hero: "Kiriko",
    ability: "Protection Suzu",
    ability_slot: 2,
    impact_rating: "critical",
    phase: "early",
    map: "Lijiang Tower",
    map_type: "Control",
    scrim: "A",
    overall_win_rate: 66.6667,
    win_rate_delta: 33.3333,
  },
  {
    won: 1,
    result: "win",
    hero: "Kiriko",
    ability: "Protection Suzu",
    ability_slot: 2,
    impact_rating: "critical",
    phase: "early",
    map: "King's Row",
    map_type: "Hybrid",
    scrim: "B",
    overall_win_rate: 66.6667,
    win_rate_delta: 33.3333,
  },
  {
    won: 0,
    result: "loss",
    hero: "Kiriko",
    ability: "Protection Suzu",
    ability_slot: 2,
    impact_rating: "critical",
    phase: "late",
    map: "Suravasa",
    map_type: "Flashpoint",
    scrim: "C",
    overall_win_rate: 66.6667,
    win_rate_delta: -66.6667,
  },
  {
    won: 0,
    result: "loss",
    hero: "Ana",
    ability: "Sleep Dart",
    ability_slot: 1,
    impact_rating: "high",
    phase: "early",
    map: "Lijiang Tower",
    map_type: "Control",
    scrim: "A",
    overall_win_rate: 50,
    win_rate_delta: -50,
  },
  {
    won: 1,
    result: "win",
    hero: "Ana",
    ability: "Sleep Dart",
    ability_slot: 1,
    impact_rating: "high",
    phase: "mid",
    map: "King's Row",
    map_type: "Hybrid",
    scrim: "B",
    overall_win_rate: 50,
    win_rate_delta: 50,
  },
];

function spec(partial: Partial<QuerySpec>): QuerySpec {
  return querySpecSchema.parse({
    dataset: "ability_timing",
    teamId: 1,
    metrics: [
      { metric: "win_rate", agg: "avg" },
      { metric: "fights", agg: "count" },
    ],
    ...partial,
  });
}

describe("computed aggregator (ability timing)", () => {
  it("ranks phases for a specific ability", () => {
    const { rows } = aggregateComputed(
      ABILITY_TIMING_ROWS,
      spec({
        dimensions: ["phase"],
        filters: [{ field: "ability", op: "in", value: ["Protection Suzu"] }],
        sort: { key: "avg__win_rate", dir: "desc" },
      })
    );

    expect(rows.map((row) => row.phase)).toEqual(["early", "late"]);
    expect(rows[0]["avg__win_rate"]).toBe(100);
    expect(rows[0]["count__fights"]).toBe(2);
    expect(rows[1]["avg__win_rate"]).toBe(0);
  });

  it("compares phase win-rate deltas from ability baseline", () => {
    const { rows } = aggregateComputed(
      ABILITY_TIMING_ROWS,
      spec({
        metrics: [{ metric: "win_rate_delta", agg: "avg" }],
        dimensions: ["ability", "phase"],
        filters: [{ field: "phase", op: "in", value: ["early"] }],
        sort: { key: "avg__win_rate_delta", dir: "desc" },
      })
    );

    expect(rows.map((row) => `${row.ability}:${row.phase}`)).toEqual([
      "Protection Suzu:early",
      "Sleep Dart:early",
    ]);
    expect(rows[0]["avg__win_rate_delta"]).toBeCloseTo(33.3333, 4);
    expect(rows[1]["avg__win_rate_delta"]).toBe(-50);
  });
});
