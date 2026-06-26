import {
  aggregateComputed,
  type ComputedRow,
} from "@/lib/query-builder/aggregate";
import { querySpecSchema, type QuerySpec } from "@/lib/query-builder/types";
import { describe, expect, it } from "vitest";

const HERO_PICKRATES: ComputedRow[] = [
  {
    player: "PGE",
    hero: "Widowmaker",
    role: "Damage",
    time_played: 600,
    player_total_time_played: 1000,
    hero_total_time_played: 750,
    games: 3,
    pick_rate: 0.6,
    ownership_rate: 0.8,
  },
  {
    player: "Landon",
    hero: "Widowmaker",
    role: "Damage",
    time_played: 150,
    player_total_time_played: 900,
    hero_total_time_played: 750,
    games: 1,
    pick_rate: 0.1667,
    ownership_rate: 0.2,
  },
  {
    player: "PGE",
    hero: "Tracer",
    role: "Damage",
    time_played: 400,
    player_total_time_played: 1000,
    hero_total_time_played: 400,
    games: 2,
    pick_rate: 0.4,
    ownership_rate: 1,
  },
];

function spec(partial: Partial<QuerySpec>): QuerySpec {
  return querySpecSchema.parse({
    dataset: "hero_pickrate",
    teamId: 1,
    metrics: [{ metric: "pick_rate", agg: "ratio" }],
    ...partial,
  });
}

describe("computed aggregator (hero pickrate)", () => {
  it("answers a player's hero-pool share by hero", () => {
    const { rows } = aggregateComputed(
      HERO_PICKRATES,
      spec({
        dimensions: ["hero"],
        filters: [{ field: "player", op: "in", value: ["PGE"] }],
        sort: { key: "ratio__pick_rate", dir: "desc" },
      })
    );

    expect(rows.map((row) => row.hero)).toEqual(["Widowmaker", "Tracer"]);
    expect(rows[0]["ratio__pick_rate"]).toBe(60);
  });

  it("answers who owns team playtime on one hero", () => {
    const { rows } = aggregateComputed(
      HERO_PICKRATES,
      spec({
        metrics: [{ metric: "ownership_rate", agg: "ratio" }],
        dimensions: ["player"],
        filters: [{ field: "hero", op: "in", value: ["Widowmaker"] }],
        sort: { key: "ratio__ownership_rate", dir: "desc" },
      })
    );

    expect(rows.map((row) => row.player)).toEqual(["PGE", "Landon"]);
    expect(rows[0]["ratio__ownership_rate"]).toBe(80);
  });

  it("applies grouped metric filters to ownership thresholds", () => {
    const { rows } = aggregateComputed(
      HERO_PICKRATES,
      spec({
        metrics: [
          { metric: "ownership_rate", agg: "ratio" },
          { metric: "games", agg: "sum" },
        ],
        dimensions: ["player"],
        filters: [
          { field: "hero", op: "in", value: ["Widowmaker"] },
          { field: "ownership_rate", op: "gte", value: 40 },
          { field: "games", op: "gte", value: 1 },
        ],
      })
    );

    expect(rows).toEqual([
      {
        player: "PGE",
        ratio__ownership_rate: 80,
        sum__games: 3,
      },
    ]);
  });
});
