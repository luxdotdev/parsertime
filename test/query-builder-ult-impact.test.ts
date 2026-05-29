import {
  aggregateComputed,
  type ComputedRow,
} from "@/lib/query-builder/aggregate";
import { querySpecSchema, type QuerySpec } from "@/lib/query-builder/types";
import { describe, expect, it } from "vitest";

const ULT_IMPACT_ROWS: ComputedRow[] = [
  {
    hero: "Genji",
    scenario: "we used uncontested",
    side: "us",
    mirrored: "no",
    first_side: "us",
    fights: 4,
    wins: 3,
    losses: 1,
    win_rate: 0.75,
  },
  {
    hero: "Genji",
    scenario: "enemy used uncontested",
    side: "enemy",
    mirrored: "no",
    first_side: "enemy",
    fights: 2,
    wins: 0,
    losses: 2,
    win_rate: 0,
  },
  {
    hero: "Genji",
    scenario: "mirror, we first",
    side: "both",
    mirrored: "yes",
    first_side: "us",
    fights: 3,
    wins: 2,
    losses: 1,
    win_rate: 0.667,
  },
  {
    hero: "Tracer",
    scenario: "we used uncontested",
    side: "us",
    mirrored: "no",
    first_side: "us",
    fights: 5,
    wins: 2,
    losses: 3,
    win_rate: 0.4,
  },
];

function spec(partial: Partial<QuerySpec>): QuerySpec {
  return querySpecSchema.parse({
    dataset: "ult_impact",
    teamId: 1,
    metrics: [
      { metric: "win_rate", agg: "ratio" },
      { metric: "fights", agg: "sum" },
    ],
    ...partial,
  });
}

describe("computed aggregator (ult impact)", () => {
  it("answers hero ult impact questions by scenario", () => {
    const { rows } = aggregateComputed(
      ULT_IMPACT_ROWS,
      spec({
        dimensions: ["scenario"],
        filters: [
          { field: "hero", op: "in", value: ["Genji"] },
          { field: "side", op: "in", value: ["us", "both"] },
        ],
        sort: { key: "ratio__win_rate", dir: "desc" },
      })
    );

    expect(rows.map((row) => row.scenario)).toEqual([
      "we used uncontested",
      "mirror, we first",
    ]);
    expect(rows[0]["ratio__win_rate"]).toBe(75);
    expect(rows[1]["sum__fights"]).toBe(3);
  });
});
