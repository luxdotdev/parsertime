import {
  aggregateComputed,
  type ComputedRow,
} from "@/lib/query-builder/aggregate";
import { querySpecSchema, type QuerySpec } from "@/lib/query-builder/types";
import { describe, expect, it } from "vitest";

const FIGHTS: ComputedRow[] = [
  { won: 1, ults_used: 2, result: "win", map_type: "Control", scrim: "A" },
  { won: 0, ults_used: 2, result: "loss", map_type: "Control", scrim: "A" },
  { won: 1, ults_used: 2, result: "win", map_type: "Hybrid", scrim: "B" },
  { won: 0, ults_used: 0, result: "loss", map_type: "Control", scrim: "A" },
  { won: 1, ults_used: 1, result: "win", map_type: "Push", scrim: "C" },
];

function spec(partial: Partial<QuerySpec>): QuerySpec {
  return querySpecSchema.parse({
    dataset: "teamfight",
    teamId: 1,
    metrics: [{ metric: "win_rate", agg: "avg" }],
    ...partial,
  });
}

describe("computed aggregator (teamfights)", () => {
  it("computes win rate and fight counts grouped by ultimates used", () => {
    const { columns, rows } = aggregateComputed(
      FIGHTS,
      spec({
        metrics: [
          { metric: "win_rate", agg: "avg" },
          { metric: "fights", agg: "count" },
        ],
        dimensions: ["ults_used"],
        sort: { key: "ults_used", dir: "asc" },
      })
    );

    expect(columns.map((c) => c.key)).toEqual([
      "ults_used",
      "avg__win_rate",
      "count__fights",
    ]);

    const byUlts = Object.fromEntries(rows.map((r) => [r.ults_used, r]));
    // 0 ults: 1 fight, lost
    expect(byUlts["0"]["count__fights"]).toBe(1);
    expect(byUlts["0"]["avg__win_rate"]).toBe(0);
    // 1 ult: 1 fight, won
    expect(byUlts["1"]["avg__win_rate"]).toBe(100);
    // 2 ults: 3 fights, 2 wins -> 66.67%
    expect(byUlts["2"]["count__fights"]).toBe(3);
    expect(byUlts["2"]["avg__win_rate"]).toBeCloseTo(66.666, 1);
  });

  it("answers 'win rate when we use exactly 2 ultimates' via a filter", () => {
    const { rows } = aggregateComputed(
      FIGHTS,
      spec({
        metrics: [
          { metric: "win_rate", agg: "avg" },
          { metric: "fights", agg: "count" },
        ],
        filters: [{ field: "ults_used", op: "eq", value: 2 }],
      })
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]["count__fights"]).toBe(3);
    expect(rows[0]["avg__win_rate"]).toBeCloseTo(66.666, 1);
  });

  it("supports numeric threshold filters and win/loss filters", () => {
    const atLeastOne = aggregateComputed(
      FIGHTS,
      spec({
        metrics: [{ metric: "fights", agg: "count" }],
        filters: [{ field: "ults_used", op: "gte", value: 1 }],
      })
    );
    expect(atLeastOne.rows[0]["count__fights"]).toBe(4);

    const onlyWins = aggregateComputed(
      FIGHTS,
      spec({
        metrics: [{ metric: "fights", agg: "count" }],
        filters: [{ field: "result", op: "eq", value: "win" }],
      })
    );
    expect(onlyWins.rows[0]["count__fights"]).toBe(3);
  });
});
