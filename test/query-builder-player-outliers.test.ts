import {
  aggregateComputed,
  type ComputedRow,
} from "@/lib/query-builder/aggregate";
import { querySpecSchema, type QuerySpec } from "@/lib/query-builder/types";
import { describe, expect, it } from "vitest";

const PLAYER_OUTLIER_ROWS: ComputedRow[] = [
  {
    player: "PGE",
    stat: "Hero damage",
    stat_key: "hero_damage_dealt",
    primary_hero: "Widowmaker",
    role: "Damage",
    direction: "high",
    outlier: "yes",
    maps: 4,
    hero_time_played: 1500,
    per10_value: 9800,
    baseline_per10: 7600,
    baseline_stddev: 900,
    z_score: 2.44,
    abs_z_score: 2.44,
    percentile: 99.3,
    sample_players: 80,
  },
  {
    player: "PGE",
    stat: "Deaths",
    stat_key: "deaths",
    primary_hero: "Widowmaker",
    role: "Damage",
    direction: "low",
    outlier: "no",
    maps: 4,
    hero_time_played: 1500,
    per10_value: 6,
    baseline_per10: 5,
    baseline_stddev: 1,
    z_score: -1,
    abs_z_score: 1,
    percentile: 15.9,
    sample_players: 80,
  },
  {
    player: "Landon",
    stat: "Healing",
    stat_key: "healing_dealt",
    primary_hero: "Kiriko",
    role: "Support",
    direction: "high",
    outlier: "yes",
    maps: 4,
    hero_time_played: 1500,
    per10_value: 11200,
    baseline_per10: 9000,
    baseline_stddev: 800,
    z_score: 2.75,
    abs_z_score: 2.75,
    percentile: 99.7,
    sample_players: 65,
  },
];

function spec(partial: Partial<QuerySpec>): QuerySpec {
  return querySpecSchema.parse({
    dataset: "player_outlier",
    teamId: 1,
    metrics: [{ metric: "abs_z_score", agg: "max" }],
    ...partial,
  });
}

describe("computed aggregator (player outliers)", () => {
  it("ranks players by strongest outlier", () => {
    const { rows } = aggregateComputed(
      PLAYER_OUTLIER_ROWS,
      spec({
        dimensions: ["player"],
        filters: [{ field: "outlier", op: "eq", value: "yes" }],
        sort: { key: "max__abs_z_score", dir: "desc" },
      })
    );

    expect(rows.map((row) => row.player)).toEqual(["Landon", "PGE"]);
  });

  it("filters outliers by stat", () => {
    const { rows } = aggregateComputed(
      PLAYER_OUTLIER_ROWS,
      spec({
        dimensions: ["player"],
        filters: [{ field: "stat", op: "in", value: ["hero_damage_dealt"] }],
      })
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].player).toBe("PGE");
    expect(rows[0]["max__abs_z_score"]).toBe(2.44);
  });

  it("can drill into a player's outlier stats", () => {
    const { rows } = aggregateComputed(
      PLAYER_OUTLIER_ROWS,
      spec({
        metrics: [{ metric: "z_score", agg: "avg" }],
        dimensions: ["stat"],
        filters: [{ field: "player", op: "in", value: ["PGE"] }],
        sort: { key: "avg__z_score", dir: "desc" },
      })
    );

    expect(rows.map((row) => row.stat)).toEqual(["Hero damage", "Deaths"]);
  });
});
