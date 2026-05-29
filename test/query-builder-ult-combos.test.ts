import {
  aggregateComputed,
  type ComputedRow,
} from "@/lib/query-builder/aggregate";
import { querySpecSchema, type QuerySpec } from "@/lib/query-builder/types";
import { describe, expect, it } from "vitest";

const ULT_COMBO_ROWS: ComputedRow[] = [
  {
    type: "combo",
    combo: "Genji + Zarya",
    hero: "Genji|Zarya",
    hero_a: "Genji",
    hero_b: "Zarya",
    enemy_hero: null,
    response_hero: null,
    uses: 2,
    wins: 1,
    losses: 1,
    win_rate: 0.5,
  },
  {
    type: "combo",
    combo: "Ana + Zarya",
    hero: "Ana|Zarya",
    hero_a: "Ana",
    hero_b: "Zarya",
    enemy_hero: null,
    response_hero: null,
    uses: 1,
    wins: 1,
    losses: 0,
    win_rate: 1,
  },
  {
    type: "response",
    combo: "Zarya into Reinhardt",
    hero: "Reinhardt|Zarya",
    hero_a: null,
    hero_b: null,
    enemy_hero: "Reinhardt",
    response_hero: "Zarya",
    uses: 2,
    wins: 2,
    losses: 0,
    win_rate: 1,
  },
];

function spec(partial: Partial<QuerySpec>): QuerySpec {
  return querySpecSchema.parse({
    dataset: "ult_combo",
    teamId: 1,
    metrics: [
      { metric: "win_rate", agg: "ratio" },
      { metric: "uses", agg: "sum" },
    ],
    ...partial,
  });
}

describe("computed aggregator (ult combos)", () => {
  it("ranks ult combos with a hero-membership filter", () => {
    const { rows } = aggregateComputed(
      ULT_COMBO_ROWS,
      spec({
        dimensions: ["combo"],
        filters: [
          { field: "type", op: "eq", value: "combo" },
          { field: "hero", op: "in", value: ["Zarya"] },
        ],
        sort: { key: "ratio__win_rate", dir: "desc" },
      })
    );

    expect(rows.map((row) => row.combo)).toEqual([
      "Ana + Zarya",
      "Genji + Zarya",
    ]);
    expect(rows[0]["ratio__win_rate"]).toBe(100);
    expect(rows[1]["sum__uses"]).toBe(2);
  });

  it("answers counter-ult response questions by enemy and response hero", () => {
    const { rows } = aggregateComputed(
      ULT_COMBO_ROWS,
      spec({
        dimensions: ["enemy_hero", "response_hero"],
        filters: [{ field: "type", op: "eq", value: "response" }],
      })
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      enemy_hero: "Reinhardt",
      response_hero: "Zarya",
      sum__uses: 2,
      ratio__win_rate: 100,
    });
  });
});
