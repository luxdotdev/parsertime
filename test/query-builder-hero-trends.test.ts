import {
  aggregateComputed,
  type ComputedRow,
} from "@/lib/query-builder/aggregate";
import { querySpecSchema, type QuerySpec } from "@/lib/query-builder/types";
import { describe, expect, it } from "vitest";

const HERO_TREND_ROWS: ComputedRow[] = [
  {
    hero: "Tracer",
    role: "Damage",
    map: "King's Row",
    map_type: "Hybrid",
    trend: "increasing",
    time_played: 900,
    appearances: 3,
    team_appearances: 4,
    wins: 2,
    games: 3,
    maps_played: 3,
    playtime_trend: 80,
    pick_rate_trend: 25,
  },
  {
    hero: "Widowmaker",
    role: "Damage",
    map: "King's Row",
    map_type: "Hybrid",
    trend: "declining",
    time_played: 300,
    appearances: 1,
    team_appearances: 4,
    wins: 0,
    games: 1,
    maps_played: 1,
    playtime_trend: -60,
    pick_rate_trend: -25,
  },
  {
    hero: "Winston",
    role: "Tank",
    map: "Lijiang Tower",
    map_type: "Control",
    trend: "stable",
    time_played: 600,
    appearances: 2,
    team_appearances: 2,
    wins: 1,
    games: 2,
    maps_played: 2,
    playtime_trend: 0,
    pick_rate_trend: 0,
  },
];

function spec(partial: Partial<QuerySpec>): QuerySpec {
  return querySpecSchema.parse({
    dataset: "hero_trend",
    teamId: 1,
    metrics: [{ metric: "playtime_trend", agg: "avg" }],
    ...partial,
  });
}

describe("computed aggregator (hero trends)", () => {
  it("ranks heroes by playtime trend", () => {
    const { rows } = aggregateComputed(
      HERO_TREND_ROWS,
      spec({
        dimensions: ["hero"],
        sort: { key: "avg__playtime_trend", dir: "desc" },
      })
    );

    expect(rows.map((row) => row.hero)).toEqual([
      "Tracer",
      "Winston",
      "Widowmaker",
    ]);
  });

  it("filters increasing hero trends", () => {
    const { rows } = aggregateComputed(
      HERO_TREND_ROWS,
      spec({
        dimensions: ["hero"],
        filters: [{ field: "trend", op: "in", value: ["increasing"] }],
      })
    );

    expect(rows).toEqual([{ hero: "Tracer", avg__playtime_trend: 80 }]);
  });

  it("computes pick and win rates from trend denominators", () => {
    const { rows } = aggregateComputed(
      HERO_TREND_ROWS,
      spec({
        metrics: [
          { metric: "pick_rate", agg: "ratio" },
          { metric: "win_rate", agg: "ratio" },
        ],
        dimensions: ["map"],
        filters: [{ field: "map", op: "in", value: ["King's Row"] }],
      })
    );

    expect(rows).toEqual([
      {
        map: "King's Row",
        ratio__pick_rate: 50,
        ratio__win_rate: 50,
      },
    ]);
  });
});
