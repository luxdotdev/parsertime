import {
  aggregateComputed,
  type ComputedRow,
} from "@/lib/query-builder/aggregate";
import { querySpecSchema, type QuerySpec } from "@/lib/query-builder/types";
import { describe, expect, it } from "vitest";

const PLAYER_MAP_ROWS: ComputedRow[] = [
  {
    player: "PGE",
    map: "Circuit Royal",
    map_type: "Escort",
    games: 4,
    wins: 3,
    losses: 1,
    win_rate: 0.75,
  },
  {
    player: "Landon",
    map: "Circuit Royal",
    map_type: "Escort",
    games: 4,
    wins: 2,
    losses: 2,
    win_rate: 0.5,
  },
  {
    player: "PGE",
    map: "King's Row",
    map_type: "Hybrid",
    games: 2,
    wins: 1,
    losses: 1,
    win_rate: 0.5,
  },
];

function spec(partial: Partial<QuerySpec>): QuerySpec {
  return querySpecSchema.parse({
    dataset: "player_map_performance",
    teamId: 1,
    metrics: [{ metric: "win_rate", agg: "ratio" }],
    ...partial,
  });
}

describe("computed aggregator (player map performance)", () => {
  it("ranks players on a specific map without hero-swap double counting", () => {
    const { rows } = aggregateComputed(
      PLAYER_MAP_ROWS,
      spec({
        dimensions: ["player"],
        filters: [{ field: "map", op: "in", value: ["Circuit Royal"] }],
        sort: { key: "ratio__win_rate", dir: "desc" },
      })
    );

    expect(rows.map((row) => row.player)).toEqual(["PGE", "Landon"]);
    expect(rows[0]["ratio__win_rate"]).toBe(75);
  });

  it("aggregates one player's map win rates by map", () => {
    const { rows } = aggregateComputed(
      PLAYER_MAP_ROWS,
      spec({
        dimensions: ["map"],
        filters: [{ field: "player", op: "in", value: ["PGE"] }],
        sort: { key: "ratio__win_rate", dir: "desc" },
      })
    );

    expect(rows.map((row) => row.map)).toEqual(["Circuit Royal", "King's Row"]);
    expect(rows[0]["ratio__win_rate"]).toBe(75);
  });

  it("filters grouped player-map metrics after aggregation", () => {
    const { rows } = aggregateComputed(
      PLAYER_MAP_ROWS,
      spec({
        metrics: [
          { metric: "win_rate", agg: "ratio" },
          { metric: "games", agg: "sum" },
        ],
        dimensions: ["player"],
        filters: [
          { field: "win_rate", op: "gte", value: 60 },
          { field: "games", op: "gte", value: 6 },
        ],
      })
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].player).toBe("PGE");
    expect(rows[0]["ratio__win_rate"]).toBeCloseTo((4 / 6) * 100);
    expect(rows[0]["sum__games"]).toBe(6);
  });
});
