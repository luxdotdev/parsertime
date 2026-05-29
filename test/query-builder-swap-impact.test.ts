import {
  aggregateComputed,
  type ComputedRow,
} from "@/lib/query-builder/aggregate";
import { querySpecSchema, type QuerySpec } from "@/lib/query-builder/types";
import { describe, expect, it } from "vitest";

const MAPS: ComputedRow[] = [
  {
    loss: 0,
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
    loss: 1,
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
    loss: 0,
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

  it("filters swap impact questions to a specific map", () => {
    const { rows } = aggregateComputed(
      MAPS,
      spec({
        filters: [
          { field: "map", op: "in", value: ["King's Row"] },
          { field: "had_swap", op: "eq", value: "yes" },
        ],
      })
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]["avg__win_rate"]).toBe(0);
    expect(rows[0]["count__maps"]).toBe(1);
  });

  it("counts losses by swap count bucket", () => {
    const { rows } = aggregateComputed(
      MAPS,
      spec({
        metrics: [{ metric: "losses", agg: "sum" }],
        dimensions: ["swap_count_bucket"],
        sort: { key: "sum__losses", dir: "desc" },
      })
    );

    expect(rows.map((row) => row.swap_count_bucket)).toEqual([
      "3+ swaps",
      "1 swap",
      "0 swaps",
    ]);
    expect(rows[0]["sum__losses"]).toBe(1);
  });
});
