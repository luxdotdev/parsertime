import {
  aggregateComputed,
  type ComputedRow,
} from "@/lib/query-builder/aggregate";
import { querySpecSchema, type QuerySpec } from "@/lib/query-builder/types";
import { describe, expect, it } from "vitest";

const HERO_DIVERSITY_ROWS: ComputedRow[] = [
  {
    role: "Tank",
    unique_heroes: 2,
    effective_hero_pool: 1,
    diversity_score: 40,
    role_coverage: 0.4,
    role_capacity: 5,
    total_playtime: 1200,
    appearances: 6,
    maps_played: 4,
    average_maps_per_hero: 2.5,
    specialist_heroes: 1,
    shared_heroes: 1,
  },
  {
    role: "Damage",
    unique_heroes: 4,
    effective_hero_pool: 3,
    diversity_score: 33.3,
    role_coverage: 0.333,
    role_capacity: 12,
    total_playtime: 2400,
    appearances: 12,
    maps_played: 5,
    average_maps_per_hero: 3,
    specialist_heroes: 2,
    shared_heroes: 2,
  },
  {
    role: "Support",
    unique_heroes: 3,
    effective_hero_pool: 2,
    diversity_score: 50,
    role_coverage: 0.5,
    role_capacity: 6,
    total_playtime: 1800,
    appearances: 9,
    maps_played: 5,
    average_maps_per_hero: 3,
    specialist_heroes: 1,
    shared_heroes: 2,
  },
];

function spec(partial: Partial<QuerySpec>): QuerySpec {
  return querySpecSchema.parse({
    dataset: "hero_diversity",
    teamId: 1,
    metrics: [{ metric: "diversity_score", agg: "avg" }],
    ...partial,
  });
}

describe("computed aggregator (hero diversity)", () => {
  it("ranks role hero-pool diversity", () => {
    const { rows } = aggregateComputed(
      HERO_DIVERSITY_ROWS,
      spec({
        dimensions: ["role"],
        sort: { key: "avg__diversity_score", dir: "desc" },
      })
    );

    expect(rows.map((row) => row.role)).toEqual(["Support", "Tank", "Damage"]);
    expect(rows[0]["avg__diversity_score"]).toBe(50);
  });

  it("summarizes unique and effective hero counts across roles", () => {
    const { rows } = aggregateComputed(
      HERO_DIVERSITY_ROWS,
      spec({
        metrics: [
          { metric: "unique_heroes", agg: "sum" },
          { metric: "effective_hero_pool", agg: "sum" },
        ],
      })
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]["sum__unique_heroes"]).toBe(9);
    expect(rows[0]["sum__effective_hero_pool"]).toBe(6);
  });

  it("filters to a role and exposes ownership-shape metrics", () => {
    const { rows } = aggregateComputed(
      HERO_DIVERSITY_ROWS,
      spec({
        metrics: [
          { metric: "average_maps_per_hero", agg: "avg" },
          { metric: "shared_heroes", agg: "sum" },
        ],
        filters: [{ field: "role", op: "in", value: ["Support"] }],
      })
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]["avg__average_maps_per_hero"]).toBe(3);
    expect(rows[0]["sum__shared_heroes"]).toBe(2);
  });

  it("applies grouped metric filters to diversity thresholds", () => {
    const { rows } = aggregateComputed(
      HERO_DIVERSITY_ROWS,
      spec({
        metrics: [
          { metric: "diversity_score", agg: "avg" },
          { metric: "maps_played", agg: "sum" },
        ],
        dimensions: ["role"],
        filters: [
          { field: "diversity_score", op: "gte", value: 45 },
          { field: "maps_played", op: "gte", value: 5 },
        ],
      })
    );

    expect(rows).toEqual([
      {
        role: "Support",
        avg__diversity_score: 50,
        sum__maps_played: 5,
      },
    ]);
  });
});
