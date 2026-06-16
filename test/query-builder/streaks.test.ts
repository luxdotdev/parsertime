import {
  aggregateComputed,
  type ComputedRow,
} from "@/lib/query-builder/aggregate";
import { querySpecSchema, type QuerySpec } from "@/lib/query-builder/types";
import { describe, expect, it } from "vitest";

const STREAK_ROWS: ComputedRow[] = [
  {
    streak: "current streak",
    result: "win",
    length: 3,
    start_date: "2026-05-20",
    end_date: "2026-05-24",
  },
  {
    streak: "longest win streak",
    result: "win",
    length: 5,
    start_date: "2026-05-01",
    end_date: "2026-05-12",
  },
  {
    streak: "longest loss streak",
    result: "loss",
    length: 2,
    start_date: "2026-05-13",
    end_date: "2026-05-15",
  },
];

function spec(partial: Partial<QuerySpec>): QuerySpec {
  return querySpecSchema.parse({
    dataset: "streak",
    teamId: 1,
    metrics: [{ metric: "length", agg: "max" }],
    ...partial,
  });
}

describe("computed aggregator (streaks)", () => {
  it("answers current streak length questions", () => {
    const { rows } = aggregateComputed(
      STREAK_ROWS,
      spec({
        dimensions: ["result"],
        filters: [{ field: "streak", op: "eq", value: "current streak" }],
      })
    );

    expect(rows).toEqual([{ result: "win", max__length: 3 }]);
  });

  it("answers longest loss streak questions", () => {
    const { rows } = aggregateComputed(
      STREAK_ROWS,
      spec({
        filters: [{ field: "streak", op: "eq", value: "longest loss streak" }],
      })
    );

    expect(rows).toEqual([{ max__length: 2 }]);
  });

  it("filters grouped streak metrics after aggregation", () => {
    const { rows } = aggregateComputed(
      STREAK_ROWS,
      spec({
        dimensions: ["streak"],
        filters: [{ field: "length", op: "gte", value: 3 }],
        sort: { key: "max__length", dir: "desc" },
      })
    );

    expect(rows.map((row) => row.streak)).toEqual([
      "longest win streak",
      "current streak",
    ]);
    expect(rows.map((row) => row["max__length"])).toEqual([5, 3]);
  });
});
