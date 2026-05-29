import {
  aggregateComputed,
  type ComputedRow,
} from "@/lib/query-builder/aggregate";
import { querySpecSchema, type QuerySpec } from "@/lib/query-builder/types";
import { describe, expect, it } from "vitest";

const PLAYER_IMPACT_ROWS: ComputedRow[] = [
  {
    player: "PGE",
    hero: "Widowmaker|Tracer",
    primary_hero: "Widowmaker",
    role: "Damage",
    maps: 8,
    hero_time_played: 2400,
    eliminations: 80,
    final_blows: 36,
    deaths: 28,
    all_damage: 48000,
    hero_damage: 36000,
    healing: 0,
    damage_taken: 30000,
    ultimates_used: 18,
    consistency_score: 82,
    first_pick_percentage: 31,
    first_death_percentage: 18,
    first_pick_count: 10,
    first_death_count: 4,
    mvp_score: 9.5,
    map_mvp_count: 3,
    map_mvp_rate: 37.5,
    ajax_count: 2,
    kills_per_ultimate: 2.8,
    fight_reversal_percentage: 12,
    fleta_deadlift_percentage: 27,
    all_damage_per10_stddev: 900,
    deaths_per10_stddev: 1.2,
    healing_per10_stddev: 0,
  },
  {
    player: "Landon",
    hero: "Kiriko|Lucio",
    primary_hero: "Kiriko",
    role: "Support",
    maps: 8,
    hero_time_played: 2400,
    eliminations: 44,
    final_blows: 8,
    deaths: 18,
    all_damage: 18000,
    hero_damage: 15000,
    healing: 42000,
    damage_taken: 18000,
    ultimates_used: 22,
    consistency_score: 91,
    first_pick_percentage: 8,
    first_death_percentage: 9,
    first_pick_count: 2,
    first_death_count: 2,
    mvp_score: 7,
    map_mvp_count: 1,
    map_mvp_rate: 12.5,
    ajax_count: 0,
    kills_per_ultimate: 1.3,
    fight_reversal_percentage: 7,
    fleta_deadlift_percentage: 10,
    all_damage_per10_stddev: 300,
    deaths_per10_stddev: 0.6,
    healing_per10_stddev: 1800,
  },
];

function spec(partial: Partial<QuerySpec>): QuerySpec {
  return querySpecSchema.parse({
    dataset: "player_impact",
    teamId: 1,
    metrics: [{ metric: "consistency_score", agg: "avg" }],
    ...partial,
  });
}

describe("computed aggregator (player impact)", () => {
  it("ranks players by consistency score", () => {
    const { rows } = aggregateComputed(
      PLAYER_IMPACT_ROWS,
      spec({
        dimensions: ["player"],
        sort: { key: "avg__consistency_score", dir: "desc" },
      })
    );

    expect(rows.map((row) => row.player)).toEqual(["Landon", "PGE"]);
  });

  it("answers per-10 impact rates from totals", () => {
    const { rows } = aggregateComputed(
      PLAYER_IMPACT_ROWS,
      spec({
        metrics: [{ metric: "final_blows_per10", agg: "ratio" }],
        dimensions: ["player"],
        filters: [{ field: "player", op: "in", value: ["PGE"] }],
      })
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]["ratio__final_blows_per10"]).toBe(9);
  });

  it("answers comparison per-10 rates from impact totals", () => {
    const { rows } = aggregateComputed(
      PLAYER_IMPACT_ROWS,
      spec({
        metrics: [
          { metric: "all_damage_per10", agg: "ratio" },
          { metric: "damage_taken_per10", agg: "ratio" },
          { metric: "ults_used_per10", agg: "ratio" },
          { metric: "first_picks_per10", agg: "ratio" },
          { metric: "ajax_per10", agg: "ratio" },
        ],
        dimensions: ["player"],
        filters: [{ field: "player", op: "in", value: ["PGE"] }],
      })
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]["ratio__all_damage_per10"]).toBe(12000);
    expect(rows[0]["ratio__damage_taken_per10"]).toBe(7500);
    expect(rows[0]["ratio__ults_used_per10"]).toBe(4.5);
    expect(rows[0]["ratio__first_picks_per10"]).toBe(2.5);
    expect(rows[0]["ratio__ajax_per10"]).toBe(0.5);
  });

  it("filters player impact by any played hero", () => {
    const { rows } = aggregateComputed(
      PLAYER_IMPACT_ROWS,
      spec({
        metrics: [{ metric: "kills_per_ultimate", agg: "avg" }],
        dimensions: ["player"],
        filters: [{ field: "hero", op: "in", value: ["Widowmaker"] }],
      })
    );

    expect(rows.map((row) => row.player)).toEqual(["PGE"]);
    expect(rows[0]["avg__kills_per_ultimate"]).toBe(2.8);
  });

  it("answers healing volatility from map-level variance", () => {
    const { rows } = aggregateComputed(
      PLAYER_IMPACT_ROWS,
      spec({
        metrics: [{ metric: "healing_per10_stddev", agg: "avg" }],
        dimensions: ["player"],
        sort: { key: "avg__healing_per10_stddev", dir: "desc" },
      })
    );

    expect(rows.map((row) => row.player)).toEqual(["Landon", "PGE"]);
    expect(rows[0]["avg__healing_per10_stddev"]).toBe(1800);
  });

  it("filters grouped player-impact metrics after aggregation", () => {
    const { rows } = aggregateComputed(
      PLAYER_IMPACT_ROWS,
      spec({
        metrics: [
          { metric: "hero_damage_per10", agg: "ratio" },
          { metric: "maps", agg: "sum" },
          { metric: "consistency_score", agg: "avg" },
        ],
        dimensions: ["player"],
        filters: [
          { field: "hero_damage_per10", op: "gt", value: 8000 },
          { field: "maps", op: "gte", value: 8 },
          { field: "consistency_score", op: "gte", value: 80 },
        ],
      })
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].player).toBe("PGE");
    expect(rows[0]["ratio__hero_damage_per10"]).toBe(9000);
    expect(rows[0]["sum__maps"]).toBe(8);
    expect(rows[0]["avg__consistency_score"]).toBe(82);
  });
});
