import {
  aggregateComputed,
  type ComputedRow,
} from "@/lib/query-builder/aggregate";
import { querySpecSchema, type QuerySpec } from "@/lib/query-builder/types";
import { describe, expect, it } from "vitest";

const ULT_USAGE_ROWS: ComputedRow[] = [
  {
    row_type: "player",
    player: "PGE",
    hero: "Widowmaker",
    top_fight_opening_hero: "Widowmaker",
    ults_used: 8,
    maps_played: 4,
    ults_per_map: 2,
    fight_openings: 3,
  },
  {
    row_type: "player",
    player: "Landon",
    hero: "Ana",
    top_fight_opening_hero: "Ana",
    ults_used: 9,
    maps_played: 6,
    ults_per_map: 1.5,
    fight_openings: 1,
  },
  {
    row_type: "fight opening hero",
    player: null,
    hero: "Widowmaker",
    top_fight_opening_hero: "Widowmaker",
    ults_used: 0,
    maps_played: 4,
    ults_per_map: 0.75,
    fight_openings: 3,
  },
];

function spec(partial: Partial<QuerySpec>): QuerySpec {
  return querySpecSchema.parse({
    dataset: "ult_usage",
    teamId: 1,
    metrics: [{ metric: "ults_per_map", agg: "avg" }],
    ...partial,
  });
}

describe("computed aggregator (ult usage)", () => {
  it("ranks players by ultimates per map", () => {
    const { rows } = aggregateComputed(
      ULT_USAGE_ROWS,
      spec({
        dimensions: ["player"],
        filters: [{ field: "row_type", op: "eq", value: "player" }],
        sort: { key: "avg__ults_per_map", dir: "desc" },
      })
    );

    expect(rows.map((row) => row.player)).toEqual(["PGE", "Landon"]);
    expect(rows[0]["avg__ults_per_map"]).toBe(2);
  });

  it("ranks fight-opening heroes", () => {
    const { rows } = aggregateComputed(
      ULT_USAGE_ROWS,
      spec({
        metrics: [{ metric: "fight_openings", agg: "sum" }],
        dimensions: ["hero"],
        filters: [{ field: "row_type", op: "eq", value: "fight opening hero" }],
      })
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      hero: "Widowmaker",
      sum__fight_openings: 3,
    });
  });

  it("ranks fight-opening heroes per map", () => {
    const { rows } = aggregateComputed(
      ULT_USAGE_ROWS,
      spec({
        metrics: [{ metric: "fight_openings_per_map", agg: "ratio" }],
        dimensions: ["hero"],
        filters: [{ field: "row_type", op: "eq", value: "fight opening hero" }],
      })
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      hero: "Widowmaker",
      ratio__fight_openings_per_map: 0.75,
    });
  });
});
