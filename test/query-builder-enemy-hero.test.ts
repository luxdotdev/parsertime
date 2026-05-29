import {
  aggregateComputed,
  type ComputedRow,
} from "@/lib/query-builder/aggregate";
import { querySpecSchema, type QuerySpec } from "@/lib/query-builder/types";
import { describe, expect, it } from "vitest";

const ENEMY_ROWS: ComputedRow[] = [
  {
    won: 1,
    result: "win",
    enemy_hero: "Tracer",
    enemy_role: "Damage",
    map_type: "Control",
    map: "Lijiang Tower",
    scrim: "A",
  },
  {
    won: 0,
    result: "loss",
    enemy_hero: "Tracer",
    enemy_role: "Damage",
    map_type: "Hybrid",
    map: "King's Row",
    scrim: "B",
  },
  {
    won: 0,
    result: "loss",
    enemy_hero: "Winston",
    enemy_role: "Tank",
    map_type: "Hybrid",
    map: "King's Row",
    scrim: "B",
  },
];

function spec(partial: Partial<QuerySpec>): QuerySpec {
  return querySpecSchema.parse({
    dataset: "enemy_hero",
    teamId: 1,
    metrics: [
      { metric: "win_rate", agg: "avg" },
      { metric: "maps", agg: "count" },
    ],
    ...partial,
  });
}

describe("computed aggregator (enemy hero matchups)", () => {
  it("answers win rate against a specific enemy hero", () => {
    const { rows } = aggregateComputed(
      ENEMY_ROWS,
      spec({
        filters: [{ field: "enemy_hero", op: "in", value: ["Tracer"] }],
      })
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]["avg__win_rate"]).toBe(50);
    expect(rows[0]["count__maps"]).toBe(2);
  });

  it("filters enemy hero matchup questions to a specific map", () => {
    const { rows } = aggregateComputed(
      ENEMY_ROWS,
      spec({
        filters: [
          { field: "enemy_hero", op: "in", value: ["Tracer"] },
          { field: "map", op: "in", value: ["King's Row"] },
        ],
      })
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]["avg__win_rate"]).toBe(0);
    expect(rows[0]["count__maps"]).toBe(1);
  });

  it("ranks enemy heroes by matchup win rate", () => {
    const { rows } = aggregateComputed(
      ENEMY_ROWS,
      spec({
        dimensions: ["enemy_hero"],
        sort: { key: "avg__win_rate", dir: "asc" },
      })
    );

    expect(rows.map((row) => row.enemy_hero)).toEqual(["Winston", "Tracer"]);
    expect(rows[0]["avg__win_rate"]).toBe(0);
  });
});
