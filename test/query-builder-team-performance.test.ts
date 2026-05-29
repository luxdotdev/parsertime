import {
  aggregateComputed,
  type ComputedRow,
} from "@/lib/query-builder/aggregate";
import { querySpecSchema, type QuerySpec } from "@/lib/query-builder/types";
import { describe, expect, it } from "vitest";

const TEAM_PERFORMANCE_ROWS: ComputedRow[] = [
  {
    side: "our team",
    maps: 5,
    wins: 3,
    losses: 2,
    hero_time_played: 7500,
    eliminations: 210,
    final_blows: 95,
    deaths: 160,
    hero_damage: 118000,
    healing: 86000,
    damage_taken: 132000,
    first_pick_percentage: 54,
    first_pick_count: 18,
    first_death_percentage: 42,
    first_death_count: 14,
    mvp_score: 8.4,
    kills_per_ultimate: 2.3,
    fight_reversal_percentage: 16,
  },
  {
    side: "opponent",
    maps: 5,
    wins: 2,
    losses: 3,
    hero_time_played: 7500,
    eliminations: 190,
    final_blows: 82,
    deaths: 170,
    hero_damage: 110000,
    healing: 81000,
    damage_taken: 129000,
    first_pick_percentage: 46,
    first_pick_count: 14,
    first_death_percentage: 58,
    first_death_count: 18,
    mvp_score: 7.2,
    kills_per_ultimate: 1.9,
    fight_reversal_percentage: 9,
  },
];

function spec(partial: Partial<QuerySpec>): QuerySpec {
  return querySpecSchema.parse({
    dataset: "team_performance",
    teamId: 1,
    metrics: [{ metric: "win_rate", agg: "ratio" }],
    ...partial,
  });
}

describe("computed aggregator (team performance)", () => {
  it("compares team win rate by side", () => {
    const { rows } = aggregateComputed(
      TEAM_PERFORMANCE_ROWS,
      spec({
        dimensions: ["side"],
        sort: { key: "ratio__win_rate", dir: "desc" },
      })
    );

    expect(rows.map((row) => row.side)).toEqual(["our team", "opponent"]);
    expect(rows[0]["ratio__win_rate"]).toBe(60);
  });

  it("answers team per-10 rates from aggregate totals", () => {
    const { rows } = aggregateComputed(
      TEAM_PERFORMANCE_ROWS,
      spec({
        metrics: [{ metric: "final_blows_per10", agg: "ratio" }],
        filters: [{ field: "side", op: "in", value: ["our team"] }],
      })
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]["ratio__final_blows_per10"]).toBe(7.6);
  });

  it("filters opponent calculated-stat metrics", () => {
    const { rows } = aggregateComputed(
      TEAM_PERFORMANCE_ROWS,
      spec({
        metrics: [{ metric: "first_death_percentage", agg: "avg" }],
        dimensions: ["side"],
        filters: [{ field: "side", op: "in", value: ["opponent"] }],
      })
    );

    expect(rows).toEqual([
      { side: "opponent", avg__first_death_percentage: 58 },
    ]);
  });
});
