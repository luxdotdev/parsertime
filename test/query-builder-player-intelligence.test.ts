import {
  aggregateComputed,
  type ComputedRow,
} from "@/lib/query-builder/aggregate";
import { querySpecSchema, type QuerySpec } from "@/lib/query-builder/types";
import { describe, expect, it } from "vitest";

const PLAYER_INTELLIGENCE_ROWS: ComputedRow[] = [
  {
    player: "PGE",
    hero: "Widowmaker",
    role: "Damage",
    primary_hero: "Widowmaker",
    most_played_hero: "Widowmaker",
    is_primary: "yes",
    is_most_played: "yes",
    hero_pool_size: 2,
    primary_secondary_delta: 1.4,
    composite_z_score: 1.2,
    maps_played: 5,
    time_played: 900,
    player_total_time: 1200,
    most_played_time: 900,
    total_maps: 6,
    maps_on_primary: 5,
    maps_forced: 1,
    substitution_rate: 16.6667,
    elims_per10: 22,
    deaths_per10: 4,
    damage_per10: 9200,
    healing_per10: 0,
  },
  {
    player: "PGE",
    hero: "Tracer",
    role: "Damage",
    primary_hero: "Widowmaker",
    most_played_hero: "Widowmaker",
    is_primary: "no",
    is_most_played: "no",
    hero_pool_size: 2,
    primary_secondary_delta: 1.4,
    composite_z_score: -0.2,
    maps_played: 3,
    time_played: 300,
    player_total_time: 1200,
    most_played_time: 900,
    total_maps: 6,
    maps_on_primary: 5,
    maps_forced: 1,
    substitution_rate: 16.6667,
    elims_per10: 18,
    deaths_per10: 6,
    damage_per10: 7000,
    healing_per10: 0,
  },
  {
    player: "Landon",
    hero: "Kiriko",
    role: "Support",
    primary_hero: "Kiriko",
    most_played_hero: "Kiriko",
    is_primary: "yes",
    is_most_played: "yes",
    hero_pool_size: 3,
    primary_secondary_delta: 0.3,
    composite_z_score: 0.7,
    maps_played: 6,
    time_played: 600,
    player_total_time: 1500,
    most_played_time: 600,
    total_maps: 6,
    maps_on_primary: 4,
    maps_forced: 0,
    substitution_rate: 0,
    elims_per10: 12,
    deaths_per10: 3,
    damage_per10: 4000,
    healing_per10: 11000,
  },
];

function spec(partial: Partial<QuerySpec>): QuerySpec {
  return querySpecSchema.parse({
    dataset: "player_intelligence",
    teamId: 1,
    metrics: [{ metric: "hero_pool_size", agg: "avg" }],
    ...partial,
  });
}

describe("computed aggregator (player intelligence)", () => {
  it("ranks players by hero depth", () => {
    const { rows } = aggregateComputed(
      PLAYER_INTELLIGENCE_ROWS,
      spec({
        dimensions: ["player"],
        sort: { key: "avg__hero_pool_size", dir: "desc" },
      })
    );

    expect(rows.map((row) => row.player)).toEqual(["Landon", "PGE"]);
    expect(rows[0]["avg__hero_pool_size"]).toBe(3);
  });

  it("computes primary time share as a player-level ratio", () => {
    const { rows } = aggregateComputed(
      PLAYER_INTELLIGENCE_ROWS,
      spec({
        metrics: [{ metric: "primary_time_share", agg: "ratio" }],
        dimensions: ["player"],
        filters: [{ field: "player", op: "in", value: ["PGE"] }],
      })
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]["ratio__primary_time_share"]).toBe(75);
  });

  it("filters to a player's best heroes by composite z-score", () => {
    const { rows } = aggregateComputed(
      PLAYER_INTELLIGENCE_ROWS,
      spec({
        metrics: [{ metric: "composite_z_score", agg: "max" }],
        dimensions: ["hero"],
        filters: [{ field: "player", op: "in", value: ["PGE"] }],
        sort: { key: "max__composite_z_score", dir: "desc" },
      })
    );

    expect(rows.map((row) => row.hero)).toEqual(["Widowmaker", "Tracer"]);
    expect(rows[0]["max__composite_z_score"]).toBe(1.2);
  });
});
