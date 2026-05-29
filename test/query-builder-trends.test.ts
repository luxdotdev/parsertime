import {
  aggregateComputed,
  type ComputedRow,
} from "@/lib/query-builder/aggregate";
import { querySpecSchema, type QuerySpec } from "@/lib/query-builder/types";
import { describe, expect, it } from "vitest";

const TREND_ROWS: ComputedRow[] = [
  {
    won: 1,
    loss: 0,
    result: "win",
    map: "Circuit Royal",
    scrim: "A",
    date: "2026-05-20",
    day_of_week: "Wednesday",
    week: "May 18",
    month: "May 2026",
    recent_bucket: "last 5|last 10|last 20",
    recent_rank: 1,
  },
  {
    won: 0,
    loss: 1,
    result: "loss",
    map: "King's Row",
    scrim: "B",
    date: "2026-05-18",
    day_of_week: "Monday",
    week: "May 18",
    month: "May 2026",
    recent_bucket: "last 5|last 10|last 20",
    recent_rank: 2,
  },
  {
    won: 1,
    loss: 0,
    result: "win",
    map: "Lijiang Tower",
    scrim: "C",
    date: "2026-05-10",
    day_of_week: "Sunday",
    week: "May 4",
    month: "May 2026",
    recent_bucket: "last 10|last 20",
    recent_rank: 6,
  },
];

function spec(partial: Partial<QuerySpec>): QuerySpec {
  return querySpecSchema.parse({
    dataset: "trend",
    teamId: 1,
    metrics: [
      { metric: "win_rate", agg: "avg" },
      { metric: "maps", agg: "count" },
    ],
    ...partial,
  });
}

describe("computed aggregator (trends)", () => {
  it("answers recent form questions using recent buckets", () => {
    const { rows } = aggregateComputed(
      TREND_ROWS,
      spec({
        filters: [{ field: "recent_bucket", op: "eq", value: "last 5" }],
      })
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]["avg__win_rate"]).toBe(50);
    expect(rows[0]["count__maps"]).toBe(2);
  });

  it("filters recent form questions to a specific map", () => {
    const { rows } = aggregateComputed(
      TREND_ROWS,
      spec({
        filters: [{ field: "map", op: "in", value: ["King's Row"] }],
      })
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]["avg__win_rate"]).toBe(0);
    expect(rows[0]["count__maps"]).toBe(1);
  });

  it("groups win rate by week", () => {
    const { rows } = aggregateComputed(
      TREND_ROWS,
      spec({
        dimensions: ["week"],
        sort: { key: "week", dir: "asc" },
      })
    );

    expect(rows.map((row) => row.week)).toEqual(["May 18", "May 4"]);
    expect(rows[0]["avg__win_rate"]).toBe(50);
  });
});
