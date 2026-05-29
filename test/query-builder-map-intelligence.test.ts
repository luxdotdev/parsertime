import {
  aggregateComputed,
  type ComputedRow,
} from "@/lib/query-builder/aggregate";
import { querySpecSchema, type QuerySpec } from "@/lib/query-builder/types";
import { describe, expect, it } from "vitest";

const MAP_INTELLIGENCE_ROWS: ComputedRow[] = [
  {
    map: "King's Row",
    map_type: "Hybrid",
    trend: "improving",
    confidence: "low",
    maps: 10,
    wins: 7,
    losses: 3,
    win_rate_value: 70,
    recent_maps: 5,
    recent_wins: 4,
    recent_losses: 1,
    recent_win_rate_value: 80,
    weighted_wins: 5.5,
    weighted_maps: 7,
    trend_delta: 10,
  },
  {
    map: "Circuit Royal",
    map_type: "Escort",
    trend: "declining",
    confidence: "low",
    maps: 5,
    wins: 1,
    losses: 4,
    win_rate_value: 20,
    recent_maps: 5,
    recent_wins: 1,
    recent_losses: 4,
    recent_win_rate_value: 20,
    weighted_wins: 0.5,
    weighted_maps: 4,
    trend_delta: -15,
  },
  {
    map: "Numbani",
    map_type: "Hybrid",
    trend: "stable",
    confidence: "insufficient",
    maps: 2,
    wins: 1,
    losses: 1,
    win_rate_value: 50,
    recent_maps: 2,
    recent_wins: 1,
    recent_losses: 1,
    recent_win_rate_value: 50,
    weighted_wins: 0.8,
    weighted_maps: 1.6,
    trend_delta: 0,
  },
];

function spec(partial: Partial<QuerySpec>): QuerySpec {
  return querySpecSchema.parse({
    dataset: "map_intelligence",
    teamId: 1,
    metrics: [{ metric: "weighted_win_rate", agg: "ratio" }],
    ...partial,
  });
}

describe("computed aggregator (map intelligence)", () => {
  it("ranks maps by time-weighted win rate", () => {
    const { rows } = aggregateComputed(
      MAP_INTELLIGENCE_ROWS,
      spec({
        dimensions: ["map"],
        sort: { key: "ratio__weighted_win_rate", dir: "desc" },
      })
    );

    expect(rows.map((row) => row.map)).toEqual([
      "King's Row",
      "Numbani",
      "Circuit Royal",
    ]);
    expect(rows[0]["ratio__weighted_win_rate"]).toBeCloseTo(78.5714);
  });

  it("weights map-type win rate by sample count", () => {
    const { rows } = aggregateComputed(
      MAP_INTELLIGENCE_ROWS,
      spec({
        metrics: [{ metric: "win_rate", agg: "ratio" }],
        dimensions: ["map_type"],
        filters: [{ field: "map_type", op: "in", value: ["Hybrid"] }],
      })
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]["ratio__win_rate"]).toBeCloseTo(66.6667);
  });

  it("filters maps by trend classification", () => {
    const { rows } = aggregateComputed(
      MAP_INTELLIGENCE_ROWS,
      spec({
        metrics: [{ metric: "trend_delta", agg: "avg" }],
        dimensions: ["map"],
        filters: [{ field: "trend", op: "in", value: ["declining"] }],
      })
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].map).toBe("Circuit Royal");
    expect(rows[0]["avg__trend_delta"]).toBe(-15);
  });
});
