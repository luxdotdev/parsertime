import {
  aggregateComputed,
  type ComputedRow,
} from "@/lib/query-builder/aggregate";
import { querySpecSchema, type QuerySpec } from "@/lib/query-builder/types";
import { describe, expect, it } from "vitest";

const ABILITY_ROWS: ComputedRow[] = [
  {
    loss: 0,
    won: 1,
    result: "win",
    hero: "Kiriko",
    ability: "Protection Suzu",
    side: "us",
    used: "yes",
    scenario: "used by us",
    map: "Lijiang Tower",
    map_type: "Control",
    scrim: "A",
  },
  {
    loss: 1,
    won: 0,
    result: "loss",
    hero: "Kiriko",
    ability: "Protection Suzu",
    side: "us",
    used: "yes",
    scenario: "used by us",
    map: "King's Row",
    map_type: "Control",
    scrim: "B",
  },
  {
    loss: 1,
    won: 0,
    result: "loss",
    hero: "Kiriko",
    ability: "Protection Suzu",
    side: "us",
    used: "no",
    scenario: "not used by us",
    map: "King's Row",
    map_type: "Hybrid",
    scrim: "C",
  },
  {
    loss: 0,
    won: 1,
    result: "win",
    hero: "Ana",
    ability: "Sleep Dart",
    side: "enemy",
    used: "yes",
    scenario: "used by enemy",
    map: "Colosseo",
    map_type: "Push",
    scrim: "D",
  },
];

function spec(partial: Partial<QuerySpec>): QuerySpec {
  return querySpecSchema.parse({
    dataset: "ability_impact",
    teamId: 1,
    metrics: [
      { metric: "win_rate", agg: "avg" },
      { metric: "fights", agg: "count" },
    ],
    ...partial,
  });
}

describe("computed aggregator (ability impact)", () => {
  it("compares used vs not-used ability win rates", () => {
    const { rows } = aggregateComputed(
      ABILITY_ROWS,
      spec({
        dimensions: ["used"],
        filters: [
          { field: "hero", op: "in", value: ["Kiriko"] },
          { field: "ability", op: "in", value: ["Protection Suzu"] },
          { field: "side", op: "eq", value: "us" },
        ],
        sort: { key: "used", dir: "desc" },
      })
    );

    const byUsed = Object.fromEntries(rows.map((row) => [row.used, row]));
    expect(byUsed.yes["count__fights"]).toBe(2);
    expect(byUsed.yes["avg__win_rate"]).toBe(50);
    expect(byUsed.no["count__fights"]).toBe(1);
    expect(byUsed.no["avg__win_rate"]).toBe(0);
  });

  it("filters ability impact questions to a specific map", () => {
    const { rows } = aggregateComputed(
      ABILITY_ROWS,
      spec({
        dimensions: ["used"],
        filters: [
          { field: "hero", op: "in", value: ["Kiriko"] },
          { field: "ability", op: "in", value: ["Protection Suzu"] },
          { field: "side", op: "eq", value: "us" },
          { field: "map", op: "in", value: ["King's Row"] },
        ],
        sort: { key: "used", dir: "desc" },
      })
    );

    const byUsed = Object.fromEntries(rows.map((row) => [row.used, row]));
    expect(byUsed.yes["count__fights"]).toBe(1);
    expect(byUsed.yes["avg__win_rate"]).toBe(0);
    expect(byUsed.no["count__fights"]).toBe(1);
    expect(byUsed.no["avg__win_rate"]).toBe(0);
  });

  it("counts fight losses after ability use", () => {
    const { rows } = aggregateComputed(
      ABILITY_ROWS,
      spec({
        metrics: [{ metric: "losses", agg: "sum" }],
        dimensions: ["ability"],
        filters: [
          { field: "side", op: "eq", value: "us" },
          { field: "used", op: "eq", value: "yes" },
        ],
        sort: { key: "sum__losses", dir: "desc" },
      })
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].ability).toBe("Protection Suzu");
    expect(rows[0]["sum__losses"]).toBe(1);
  });

  it("filters grouped ability-impact metrics after aggregation", () => {
    const { rows } = aggregateComputed(
      ABILITY_ROWS,
      spec({
        dimensions: ["used"],
        filters: [
          { field: "hero", op: "in", value: ["Kiriko"] },
          { field: "ability", op: "in", value: ["Protection Suzu"] },
          { field: "side", op: "eq", value: "us" },
          { field: "win_rate", op: "gte", value: 50 },
          { field: "fights", op: "gte", value: 2 },
        ],
      })
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].used).toBe("yes");
    expect(rows[0]["avg__win_rate"]).toBe(50);
    expect(rows[0]["count__fights"]).toBe(2);
  });
});
