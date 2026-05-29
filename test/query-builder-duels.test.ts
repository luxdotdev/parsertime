import {
  aggregateComputed,
  type ComputedRow,
} from "@/lib/query-builder/aggregate";
import { querySpecSchema, type QuerySpec } from "@/lib/query-builder/types";
import { describe, expect, it } from "vitest";

const DUEL_ROWS: ComputedRow[] = [
  {
    loss: 0,
    outcome: 1,
    our_hero: "Tracer",
    enemy_hero: "Widowmaker",
    map_type: "Control",
    scrim: "A",
  },
  {
    loss: 1,
    outcome: 0,
    our_hero: "Tracer",
    enemy_hero: "Widowmaker",
    map_type: "Hybrid",
    scrim: "B",
  },
  {
    loss: 0,
    outcome: 1,
    our_hero: "Genji",
    enemy_hero: "Widowmaker",
    map_type: "Hybrid",
    scrim: "B",
  },
];

function spec(partial: Partial<QuerySpec>): QuerySpec {
  return querySpecSchema.parse({
    dataset: "duel",
    teamId: 1,
    metrics: [
      { metric: "win_rate", agg: "avg" },
      { metric: "duels", agg: "count" },
    ],
    ...partial,
  });
}

describe("computed aggregator (duel matchups)", () => {
  it("filters a specific our-hero versus enemy-hero matchup", () => {
    const { rows } = aggregateComputed(
      DUEL_ROWS,
      spec({
        filters: [
          { field: "our_hero", op: "in", value: ["Tracer"] },
          { field: "enemy_hero", op: "in", value: ["Widowmaker"] },
        ],
      })
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]["avg__win_rate"]).toBe(50);
    expect(rows[0]["count__duels"]).toBe(2);
  });

  it("ranks our heroes for a specific enemy hero", () => {
    const { rows } = aggregateComputed(
      DUEL_ROWS,
      spec({
        dimensions: ["our_hero"],
        filters: [{ field: "enemy_hero", op: "in", value: ["Widowmaker"] }],
        sort: { key: "avg__win_rate", dir: "desc" },
      })
    );

    expect(rows.map((row) => row.our_hero)).toEqual(["Genji", "Tracer"]);
  });

  it("counts duel losses by enemy hero", () => {
    const { rows } = aggregateComputed(
      DUEL_ROWS,
      spec({
        metrics: [{ metric: "losses", agg: "sum" }],
        dimensions: ["enemy_hero"],
        sort: { key: "sum__losses", dir: "desc" },
      })
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].enemy_hero).toBe("Widowmaker");
    expect(rows[0]["sum__losses"]).toBe(1);
  });
});
