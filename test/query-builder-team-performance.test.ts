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
    all_damage: 150000,
    hero_damage: 118000,
    healing: 86000,
    healing_received: 76000,
    damage_taken: 132000,
    damage_blocked: 22000,
    ultimates_earned: 42,
    ultimates_used: 38,
    solo_kills: 11,
    objective_kills: 40,
    offensive_assists: 52,
    defensive_assists: 34,
    first_pick_percentage: 54,
    first_pick_count: 18,
    first_death_percentage: 42,
    first_death_count: 14,
    mvp_score: 8.4,
    map_mvp_count: 3,
    map_mvp_rate: 60,
    ajax_count: 1,
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
    all_damage: 142000,
    hero_damage: 110000,
    healing: 81000,
    healing_received: 74000,
    damage_taken: 129000,
    damage_blocked: 18000,
    ultimates_earned: 39,
    ultimates_used: 35,
    solo_kills: 8,
    objective_kills: 32,
    offensive_assists: 44,
    defensive_assists: 28,
    first_pick_percentage: 46,
    first_pick_count: 14,
    first_death_percentage: 58,
    first_death_count: 18,
    mvp_score: 7.2,
    map_mvp_count: 2,
    map_mvp_rate: 40,
    ajax_count: 3,
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

  it("answers team utility rates from aggregate totals", () => {
    const { rows } = aggregateComputed(
      TEAM_PERFORMANCE_ROWS,
      spec({
        metrics: [
          { metric: "all_damage_per10", agg: "ratio" },
          { metric: "healing_received_per10", agg: "ratio" },
          { metric: "ults_earned_per10", agg: "ratio" },
          { metric: "solo_kills_per10", agg: "ratio" },
          { metric: "objective_kills_per10", agg: "ratio" },
          { metric: "offensive_assists_per10", agg: "ratio" },
          { metric: "first_picks_per10", agg: "ratio" },
          { metric: "ajax_per10", agg: "ratio" },
        ],
        filters: [{ field: "side", op: "in", value: ["our team"] }],
      })
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]["ratio__all_damage_per10"]).toBe(12000);
    expect(rows[0]["ratio__healing_received_per10"]).toBe(6080);
    expect(rows[0]["ratio__ults_earned_per10"]).toBe(3.36);
    expect(rows[0]["ratio__solo_kills_per10"]).toBe(0.88);
    expect(rows[0]["ratio__objective_kills_per10"]).toBeCloseTo(3.2);
    expect(rows[0]["ratio__offensive_assists_per10"]).toBe(4.16);
    expect(rows[0]["ratio__first_picks_per10"]).toBe(1.44);
    expect(rows[0]["ratio__ajax_per10"]).toBe(0.08);
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

  it("filters grouped team metrics after aggregation", () => {
    const { rows } = aggregateComputed(
      TEAM_PERFORMANCE_ROWS,
      spec({
        metrics: [
          { metric: "final_blows_per10", agg: "ratio" },
          { metric: "maps", agg: "sum" },
        ],
        dimensions: ["side"],
        filters: [
          { field: "final_blows_per10", op: "gte", value: 7.5 },
          { field: "maps", op: "gte", value: 5 },
        ],
      })
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].side).toBe("our team");
    expect(rows[0]["ratio__final_blows_per10"]).toBe(7.6);
    expect(rows[0]["sum__maps"]).toBe(5);
  });
});
