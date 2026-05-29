import {
  aggregateComputed,
  type ComputedRow,
} from "@/lib/query-builder/aggregate";
import { querySpecSchema, type QuerySpec } from "@/lib/query-builder/types";
import { describe, expect, it } from "vitest";

const ROLE_ROWS: ComputedRow[] = [
  {
    role: "Damage",
    won: 1,
    lost: 0,
    result: "win",
    maps: 1,
    time_played: 600,
    final_blows: 12,
    deaths: 5,
    hero_damage: 9000,
    damage_taken: 3000,
    healing: 0,
    ultimates_used: 4,
    eliminations: 24,
    map: "King's Row",
    map_type: "Hybrid",
    scrim: "A",
  },
  {
    role: "Damage",
    won: 0,
    lost: 1,
    result: "loss",
    maps: 1,
    time_played: 300,
    final_blows: 3,
    deaths: 6,
    hero_damage: 3000,
    damage_taken: 2400,
    healing: 0,
    ultimates_used: 2,
    eliminations: 8,
    map: "Lijiang Tower",
    map_type: "Control",
    scrim: "B",
  },
  {
    role: "Support",
    won: 1,
    lost: 0,
    result: "win",
    maps: 1,
    time_played: 600,
    final_blows: 2,
    deaths: 3,
    hero_damage: 2500,
    damage_taken: 2200,
    healing: 11000,
    ultimates_used: 3,
    eliminations: 12,
    map: "King's Row",
    map_type: "Hybrid",
    scrim: "A",
  },
];

function spec(partial: Partial<QuerySpec>): QuerySpec {
  return querySpecSchema.parse({
    dataset: "role_performance",
    teamId: 1,
    metrics: [{ metric: "win_rate", agg: "avg" }],
    ...partial,
  });
}

describe("computed aggregator (role performance)", () => {
  it("computes role win rates and map counts", () => {
    const { rows } = aggregateComputed(
      ROLE_ROWS,
      spec({
        metrics: [
          { metric: "win_rate", agg: "avg" },
          { metric: "maps", agg: "count" },
        ],
        dimensions: ["role"],
        sort: { key: "avg__win_rate", dir: "desc" },
      })
    );

    const support = rows.find((row) => row.role === "Support");
    const damage = rows.find((row) => row.role === "Damage");
    expect(support?.["avg__win_rate"]).toBe(100);
    expect(damage?.["avg__win_rate"]).toBe(50);
    expect(damage?.["count__maps"]).toBe(2);
  });

  it("uses weighted per-10 metrics across grouped role rows", () => {
    const { rows } = aggregateComputed(
      ROLE_ROWS,
      spec({
        metrics: [{ metric: "damage_per10", agg: "ratio" }],
        dimensions: ["role"],
        filters: [{ field: "role", op: "in", value: ["Damage"] }],
      })
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]["ratio__damage_per10"]).toBe(8000);
  });

  it("filters role performance by map type", () => {
    const { rows } = aggregateComputed(
      ROLE_ROWS,
      spec({
        metrics: [{ metric: "deaths_per10", agg: "ratio" }],
        dimensions: ["role"],
        filters: [{ field: "map_type", op: "in", value: ["Hybrid"] }],
        sort: { key: "ratio__deaths_per10", dir: "desc" },
      })
    );

    expect(rows.map((row) => row.role)).toEqual(["Damage", "Support"]);
    expect(rows[0]["ratio__deaths_per10"]).toBe(5);
    expect(rows[1]["ratio__deaths_per10"]).toBe(3);
  });
});
