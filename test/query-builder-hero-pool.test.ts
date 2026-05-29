import {
  aggregateComputed,
  type ComputedRow,
} from "@/lib/query-builder/aggregate";
import { querySpecSchema, type QuerySpec } from "@/lib/query-builder/types";
import { describe, expect, it } from "vitest";

const HERO_ROWS: ComputedRow[] = [
  {
    loss: 0,
    won: 1,
    result: "win",
    player: "PGE",
    hero: "Widowmaker",
    role: "Damage",
    time_played: 300,
    eliminations: 20,
    final_blows: 12,
    deaths: 3,
    assists: 5,
    hero_damage: 4200,
    damage_taken: 1800,
    healing: 0,
    ultimates_earned: 3,
    ultimates_used: 3,
    map_type: "Escort",
    map: "Circuit Royal",
    scrim: "A",
  },
  {
    loss: 1,
    won: 0,
    result: "loss",
    player: "PGE",
    hero: "Widowmaker",
    role: "Damage",
    time_played: 240,
    eliminations: 15,
    final_blows: 7,
    deaths: 5,
    assists: 4,
    hero_damage: 3100,
    damage_taken: 2100,
    healing: 0,
    ultimates_earned: 2,
    ultimates_used: 2,
    map_type: "Hybrid",
    map: "King's Row",
    scrim: "B",
  },
  {
    loss: 0,
    won: 1,
    result: "win",
    player: "Landon",
    hero: "Ana",
    role: "Support",
    time_played: 540,
    eliminations: 11,
    final_blows: 2,
    deaths: 2,
    assists: 16,
    hero_damage: 1200,
    damage_taken: 900,
    healing: 9300,
    ultimates_earned: 4,
    ultimates_used: 4,
    map_type: "Control",
    map: "Lijiang Tower",
    scrim: "C",
  },
];

function spec(partial: Partial<QuerySpec>): QuerySpec {
  return querySpecSchema.parse({
    dataset: "hero_pool",
    teamId: 1,
    metrics: [
      { metric: "win_rate", agg: "avg" },
      { metric: "time_played", agg: "sum" },
    ],
    ...partial,
  });
}

describe("computed aggregator (hero pool)", () => {
  it("answers hero winrate and playtime questions by hero", () => {
    const { rows } = aggregateComputed(
      HERO_ROWS,
      spec({
        dimensions: ["hero"],
        filters: [{ field: "role", op: "in", value: ["Damage"] }],
      })
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].hero).toBe("Widowmaker");
    expect(rows[0]["avg__win_rate"]).toBe(50);
    expect(rows[0]["sum__time_played"]).toBe(540);
  });

  it("computes weighted role-performance rates for custom hero-pool metrics", () => {
    const { rows } = aggregateComputed(
      HERO_ROWS,
      spec({
        metrics: [
          { metric: "hero_damage", agg: "per10" },
          { metric: "deaths", agg: "per10" },
          { metric: "ult_efficiency", agg: "ratio" },
        ],
        dimensions: ["role"],
        filters: [{ field: "role", op: "in", value: ["Damage"] }],
      })
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].role).toBe("Damage");
    expect(rows[0]["per10__hero_damage"]).toBeCloseTo(
      ((4200 + 3100) / (300 + 240)) * 600
    );
    expect(rows[0]["per10__deaths"]).toBeCloseTo(((3 + 5) / (300 + 240)) * 600);
    expect(rows[0]["ratio__ult_efficiency"]).toBe((20 + 15) / (3 + 2));
  });

  it("counts hero wins and losses by hero", () => {
    const { rows } = aggregateComputed(
      HERO_ROWS,
      spec({
        metrics: [
          { metric: "wins", agg: "sum" },
          { metric: "losses", agg: "sum" },
        ],
        dimensions: ["hero"],
        sort: { key: "sum__losses", dir: "desc" },
      })
    );

    expect(rows.map((row) => row.hero)).toEqual(["Widowmaker", "Ana"]);
    expect(rows[0]["sum__wins"]).toBe(1);
    expect(rows[0]["sum__losses"]).toBe(1);
  });

  it("filters player winrates to a specific map", () => {
    const { rows } = aggregateComputed(
      HERO_ROWS,
      spec({
        dimensions: ["player"],
        filters: [{ field: "map", op: "in", value: ["Circuit Royal"] }],
        sort: { key: "avg__win_rate", dir: "desc" },
      })
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].player).toBe("PGE");
    expect(rows[0]["avg__win_rate"]).toBe(100);
  });
});
