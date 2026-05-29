import {
  aggregateComputed,
  type ComputedRow,
} from "@/lib/query-builder/aggregate";
import { querySpecSchema, type QuerySpec } from "@/lib/query-builder/types";
import { describe, expect, it } from "vitest";

const MAPS: ComputedRow[] = [
  {
    won: 1,
    result: "win",
    had_swap: "yes",
    swap_count: 1,
    swap_count_bucket: "1 swap",
    first_swap_timing: "early",
    map_type: "Control",
    map: "Lijiang Tower",
    scrim: "A",
  },
  {
    won: 0,
    result: "loss",
    had_swap: "yes",
    swap_count: 3,
    swap_count_bucket: "3+ swaps",
    first_swap_timing: "late",
    map_type: "Hybrid",
    map: "King's Row",
    scrim: "B",
  },
  {
    won: 1,
    result: "win",
    had_swap: "no",
    swap_count: 0,
    swap_count_bucket: "0 swaps",
    first_swap_timing: "none",
    map_type: "Escort",
    map: "Circuit Royal",
    scrim: "C",
  },
];

function spec(partial: Partial<QuerySpec>): QuerySpec {
  return querySpecSchema.parse({
    dataset: "swap_impact",
    teamId: 1,
    metrics: [
      { metric: "win_rate", agg: "avg" },
      { metric: "maps", agg: "count" },
    ],
    ...partial,
  });
}

describe("computed aggregator (swap impact)", () => {
  it("compares map win rate by whether the team swapped", () => {
    const { rows } = aggregateComputed(
      MAPS,
      spec({
        dimensions: ["had_swap"],
        sort: { key: "had_swap", dir: "asc" },
      })
    );

    const bySwap = Object.fromEntries(rows.map((row) => [row.had_swap, row]));
    expect(bySwap.yes["count__maps"]).toBe(2);
    expect(bySwap.yes["avg__win_rate"]).toBe(50);
    expect(bySwap.no["count__maps"]).toBe(1);
    expect(bySwap.no["avg__win_rate"]).toBe(100);
  });
});
