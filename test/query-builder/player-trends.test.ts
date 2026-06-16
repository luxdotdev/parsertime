import {
  aggregateComputed,
  type ComputedRow,
} from "@/lib/query-builder/aggregate";
import { querySpecSchema, type QuerySpec } from "@/lib/query-builder/types";
import { describe, expect, it } from "vitest";

const PLAYER_TREND_ROWS: ComputedRow[] = [
  {
    player: "PGE",
    metric: "Hero damage per 10",
    metric_key: "hero_damage_per10",
    direction: "improving",
    primary_hero: "Widowmaker",
    role: "Damage",
    maps: 8,
    early_maps: 4,
    late_maps: 4,
    early_value: 7000,
    late_value: 9000,
    raw_change: 2000,
    improvement: 2000,
    improvement_percentage: 28.5714,
  },
  {
    player: "PGE",
    metric: "Deaths per 10",
    metric_key: "deaths_per10",
    direction: "declining",
    primary_hero: "Widowmaker",
    role: "Damage",
    maps: 8,
    early_maps: 4,
    late_maps: 4,
    early_value: 4,
    late_value: 6,
    raw_change: 2,
    improvement: -2,
    improvement_percentage: -50,
  },
  {
    player: "Landon",
    metric: "First death %",
    metric_key: "first_death_percentage",
    direction: "improving",
    primary_hero: "Kiriko",
    role: "Support",
    maps: 8,
    early_maps: 4,
    late_maps: 4,
    early_value: 18,
    late_value: 9,
    raw_change: -9,
    improvement: 9,
    improvement_percentage: 50,
  },
];

function spec(partial: Partial<QuerySpec>): QuerySpec {
  return querySpecSchema.parse({
    dataset: "player_trend",
    teamId: 1,
    metrics: [{ metric: "improvement_percentage", agg: "avg" }],
    ...partial,
  });
}

describe("computed aggregator (player trends)", () => {
  it("ranks improving players by improvement percentage", () => {
    const { rows } = aggregateComputed(
      PLAYER_TREND_ROWS,
      spec({
        dimensions: ["player"],
        filters: [{ field: "direction", op: "in", value: ["improving"] }],
        sort: { key: "avg__improvement_percentage", dir: "desc" },
      })
    );

    expect(rows.map((row) => row.player)).toEqual(["Landon", "PGE"]);
  });

  it("filters trend rows by the requested metric", () => {
    const { rows } = aggregateComputed(
      PLAYER_TREND_ROWS,
      spec({
        dimensions: ["player"],
        filters: [{ field: "metric", op: "in", value: ["hero_damage_per10"] }],
      })
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].player).toBe("PGE");
    expect(rows[0]["avg__improvement_percentage"]).toBeCloseTo(28.5714);
  });

  it("surfaces player-specific trend metrics", () => {
    const { rows } = aggregateComputed(
      PLAYER_TREND_ROWS,
      spec({
        metrics: [{ metric: "improvement", agg: "avg" }],
        dimensions: ["metric"],
        filters: [{ field: "player", op: "in", value: ["PGE"] }],
        sort: { key: "avg__improvement", dir: "desc" },
      })
    );

    expect(rows.map((row) => row.metric)).toEqual([
      "Hero damage per 10",
      "Deaths per 10",
    ]);
  });

  it("filters grouped player-trend metrics after aggregation", () => {
    const { rows } = aggregateComputed(
      PLAYER_TREND_ROWS,
      spec({
        metrics: [
          { metric: "improvement_percentage", agg: "avg" },
          { metric: "maps", agg: "max" },
        ],
        dimensions: ["player"],
        filters: [
          { field: "direction", op: "in", value: ["improving"] },
          { field: "improvement_percentage", op: "gte", value: 30 },
          { field: "maps", op: "gte", value: 8 },
        ],
      })
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].player).toBe("Landon");
    expect(rows[0]["avg__improvement_percentage"]).toBe(50);
    expect(rows[0]["max__maps"]).toBe(8);
  });
});
