import {
  aggregateComputed,
  type ComputedRow,
} from "@/lib/query-builder/aggregate";
import { querySpecSchema, type QuerySpec } from "@/lib/query-builder/types";
import { describe, expect, it } from "vitest";

const HERO_ROWS: ComputedRow[] = [
  {
    won: 1,
    result: "win",
    player: "PGE",
    hero: "Widowmaker",
    role: "Damage",
    time_played: 300,
    final_blows: 12,
    hero_damage: 4200,
    healing: 0,
    map_type: "Escort",
    map: "Circuit Royal",
    scrim: "A",
  },
  {
    won: 0,
    result: "loss",
    player: "PGE",
    hero: "Widowmaker",
    role: "Damage",
    time_played: 240,
    final_blows: 7,
    hero_damage: 3100,
    healing: 0,
    map_type: "Hybrid",
    map: "King's Row",
    scrim: "B",
  },
  {
    won: 1,
    result: "win",
    player: "Landon",
    hero: "Ana",
    role: "Support",
    time_played: 540,
    final_blows: 2,
    hero_damage: 1200,
    healing: 9300,
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
});
