import {
  aggregateComputed,
  type ComputedRow,
} from "@/lib/query-builder/aggregate";
import { querySpecSchema, type QuerySpec } from "@/lib/query-builder/types";
import { describe, expect, it } from "vitest";

const ROSTER_ROWS: ComputedRow[] = [
  {
    map: "King's Row",
    roster: "TankA / DpsA / DpsB / SupportA / SupportB",
    player: "DpsA|DpsB|SupportA|SupportB|TankA",
    player_count: 5,
    games: 4,
    wins: 3,
    losses: 1,
    win_rate: 0.75,
    is_best_for_map: "yes",
  },
  {
    map: "King's Row",
    roster: "TankB / DpsA / DpsC / SupportA / SupportC",
    player: "DpsA|DpsC|SupportA|SupportC|TankB",
    player_count: 5,
    games: 3,
    wins: 1,
    losses: 2,
    win_rate: 0.3333333333,
    is_best_for_map: "no",
  },
  {
    map: "Circuit Royal",
    roster: "TankA / DpsA / DpsD / SupportA / SupportD",
    player: "DpsA|DpsD|SupportA|SupportD|TankA",
    player_count: 5,
    games: 2,
    wins: 2,
    losses: 0,
    win_rate: 1,
    is_best_for_map: "yes",
  },
];

function spec(partial: Partial<QuerySpec>): QuerySpec {
  return querySpecSchema.parse({
    dataset: "roster_variant",
    teamId: 1,
    metrics: [
      { metric: "win_rate", agg: "ratio" },
      { metric: "games", agg: "sum" },
    ],
    ...partial,
  });
}

describe("computed aggregator (roster variants)", () => {
  it("ranks rosters on a specific map", () => {
    const { rows } = aggregateComputed(
      ROSTER_ROWS,
      spec({
        dimensions: ["roster"],
        filters: [{ field: "map", op: "in", value: ["King's Row"] }],
        sort: { key: "ratio__win_rate", dir: "desc" },
      })
    );

    expect(rows.map((row) => row.roster)).toEqual([
      "TankA / DpsA / DpsB / SupportA / SupportB",
      "TankB / DpsA / DpsC / SupportA / SupportC",
    ]);
    expect(rows[0]["ratio__win_rate"]).toBe(75);
    expect(rows[1]["sum__games"]).toBe(3);
  });

  it("filters to the best roster rows for a map", () => {
    const { rows } = aggregateComputed(
      ROSTER_ROWS,
      spec({
        dimensions: ["roster"],
        filters: [
          { field: "map", op: "in", value: ["King's Row"] },
          { field: "is_best_for_map", op: "eq", value: "yes" },
        ],
      })
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].roster).toBe("TankA / DpsA / DpsB / SupportA / SupportB");
    expect(rows[0]["ratio__win_rate"]).toBe(75);
  });
});
