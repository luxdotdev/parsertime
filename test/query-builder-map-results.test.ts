import {
  aggregateComputed,
  type ComputedRow,
} from "@/lib/query-builder/aggregate";
import { querySpecSchema, type QuerySpec } from "@/lib/query-builder/types";
import { describe, expect, it } from "vitest";

const MAP_RESULTS: ComputedRow[] = [
  {
    won: 1,
    lost: 0,
    result: "win",
    map: "Circuit Royal",
    map_type: "Escort",
    opponent: "NRG",
    scrim: "A",
    playtime: 720,
  },
  {
    won: 0,
    lost: 1,
    result: "loss",
    map: "King's Row",
    map_type: "Hybrid",
    opponent: "NRG",
    scrim: "B",
    playtime: 960,
  },
  {
    won: 1,
    lost: 0,
    result: "win",
    map: "Lijiang Tower",
    map_type: "Control",
    opponent: "Team Peps",
    scrim: "C",
    playtime: 540,
  },
];

function spec(partial: Partial<QuerySpec>): QuerySpec {
  return querySpecSchema.parse({
    dataset: "map_result",
    teamId: 1,
    metrics: [
      { metric: "win_rate", agg: "avg" },
      { metric: "maps", agg: "count" },
    ],
    ...partial,
  });
}

describe("computed aggregator (map results)", () => {
  it("filters map win rate by opponent", () => {
    const { rows } = aggregateComputed(
      MAP_RESULTS,
      spec({
        filters: [{ field: "opponent", op: "in", value: ["NRG"] }],
      })
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]["avg__win_rate"]).toBe(50);
    expect(rows[0]["count__maps"]).toBe(2);
  });

  it("ranks maps for one opponent", () => {
    const { rows } = aggregateComputed(
      MAP_RESULTS,
      spec({
        dimensions: ["map"],
        filters: [{ field: "opponent", op: "in", value: ["NRG"] }],
        sort: { key: "avg__win_rate", dir: "desc" },
      })
    );

    expect(rows.map((row) => row.map)).toEqual(["Circuit Royal", "King's Row"]);
  });

  it("filters grouped map win rates and sample sizes after aggregation", () => {
    const { rows } = aggregateComputed(
      MAP_RESULTS,
      spec({
        dimensions: ["map_type"],
        filters: [
          { field: "win_rate", op: "gte", value: 50 },
          { field: "maps", op: "gte", value: 1 },
        ],
        sort: { key: "avg__win_rate", dir: "desc" },
      })
    );

    expect(rows.map((row) => row.map_type)).toEqual(["Escort", "Control"]);
    expect(rows.every((row) => Number(row["avg__win_rate"]) >= 50)).toBe(true);
  });

  it("ranks maps by computed match playtime", () => {
    const { rows } = aggregateComputed(
      MAP_RESULTS,
      spec({
        metrics: [{ metric: "playtime", agg: "sum" }],
        dimensions: ["map"],
        sort: { key: "sum__playtime", dir: "desc" },
      })
    );

    expect(rows.map((row) => row.map)).toEqual([
      "King's Row",
      "Circuit Royal",
      "Lijiang Tower",
    ]);
    expect(rows[0]["sum__playtime"]).toBe(960);
  });
});
