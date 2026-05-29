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
    hero_damage: 36000,
    healing: 0,
    consistency_score: 82,
    first_pick_percentage: 31,
    first_death_percentage: 18,
    mvp_score: 9.5,
    map_mvp_rate: 37.5,
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
    hero_damage: 15000,
    healing: 42000,
    consistency_score: 91,
    first_pick_percentage: 8,
    first_death_percentage: 9,
    mvp_score: 7,
    map_mvp_rate: 12.5,
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
});
