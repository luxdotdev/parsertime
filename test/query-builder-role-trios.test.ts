import {
  aggregateComputed,
  type ComputedRow,
} from "@/lib/query-builder/aggregate";
import { querySpecSchema, type QuerySpec } from "@/lib/query-builder/types";
import { describe, expect, it } from "vitest";

const ROLE_TRIO_ROWS: ComputedRow[] = [
  {
    trio: "TankA / DpsA / DpsB / SupportA / SupportB",
    player: "DpsA|DpsB|SupportA|SupportB|TankA",
    tank: "TankA",
    dps1: "DpsA",
    dps2: "DpsB",
    support1: "SupportA",
    support2: "SupportB",
    games: 5,
    wins: 4,
    losses: 1,
    win_rate: 0.8,
  },
  {
    trio: "TankB / DpsA / DpsC / SupportA / SupportC",
    player: "DpsA|DpsC|SupportA|SupportC|TankB",
    tank: "TankB",
    dps1: "DpsA",
    dps2: "DpsC",
    support1: "SupportA",
    support2: "SupportC",
    games: 4,
    wins: 2,
    losses: 2,
    win_rate: 0.5,
  },
];

function spec(partial: Partial<QuerySpec>): QuerySpec {
  return querySpecSchema.parse({
    dataset: "role_trio",
    teamId: 1,
    metrics: [
      { metric: "win_rate", agg: "ratio" },
      { metric: "games", agg: "sum" },
    ],
    ...partial,
  });
}

describe("computed aggregator (role trios)", () => {
  it("ranks role lineups and filters by any player in the lineup", () => {
    const { rows } = aggregateComputed(
      ROLE_TRIO_ROWS,
      spec({
        dimensions: ["trio"],
        filters: [{ field: "player", op: "in", value: ["DpsA"] }],
        sort: { key: "ratio__win_rate", dir: "desc" },
      })
    );

    expect(rows.map((row) => row.trio)).toEqual([
      "TankA / DpsA / DpsB / SupportA / SupportB",
      "TankB / DpsA / DpsC / SupportA / SupportC",
    ]);
    expect(rows[0]["ratio__win_rate"]).toBe(80);
    expect(rows[1]["sum__games"]).toBe(4);
  });

  it("filters grouped role-trio metrics after aggregation", () => {
    const { rows } = aggregateComputed(
      ROLE_TRIO_ROWS,
      spec({
        dimensions: ["trio"],
        filters: [
          { field: "win_rate", op: "gte", value: 75 },
          { field: "games", op: "gte", value: 5 },
        ],
      })
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].trio).toBe("TankA / DpsA / DpsB / SupportA / SupportB");
    expect(rows[0]["ratio__win_rate"]).toBe(80);
    expect(rows[0]["sum__games"]).toBe(5);
  });
});
