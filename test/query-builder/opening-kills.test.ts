import {
  aggregateComputed,
  type ComputedRow,
} from "@/lib/query-builder/aggregate";
import { querySpecSchema, type QuerySpec } from "@/lib/query-builder/types";
import { describe, expect, it } from "vitest";

const OPENING_KILLS: ComputedRow[] = [
  {
    first_event: 1,
    first_death: 1,
    first_pick: 0,
    won: 0,
    lost: 1,
    result: "loss",
    player: "PGE",
    hero: "Widowmaker",
    side: "us",
    attacker: "EnemyTracer",
    attacker_hero: "Tracer",
    attacker_side: "enemy",
    kill_time: 42,
    fight_time: 3,
    map: "King's Row",
    map_type: "Hybrid",
    scrim: "A",
  },
  {
    first_event: 1,
    first_death: 0,
    first_pick: 1,
    won: 1,
    lost: 0,
    result: "win",
    player: "EnemySojourn",
    hero: "Sojourn",
    side: "enemy",
    attacker: "PGE",
    attacker_hero: "Widowmaker",
    attacker_side: "us",
    kill_time: 88,
    fight_time: 6,
    map: "King's Row",
    map_type: "Hybrid",
    scrim: "A",
  },
  {
    first_event: 1,
    first_death: 1,
    first_pick: 0,
    won: 1,
    lost: 0,
    result: "win",
    player: "PGE",
    hero: "Widowmaker",
    side: "us",
    attacker: "EnemyWidow",
    attacker_hero: "Widowmaker",
    attacker_side: "enemy",
    kill_time: 126,
    fight_time: 2,
    map: "Lijiang Tower",
    map_type: "Control",
    scrim: "B",
  },
  {
    first_event: 1,
    first_death: 0,
    first_pick: 1,
    won: 1,
    lost: 0,
    result: "win",
    player: "EnemyAna",
    hero: "Ana",
    side: "enemy",
    attacker: "Landon",
    attacker_hero: "Kiriko",
    attacker_side: "us",
    kill_time: 152,
    fight_time: 4,
    map: "Lijiang Tower",
    map_type: "Control",
    scrim: "B",
  },
];

function spec(partial: Partial<QuerySpec>): QuerySpec {
  return querySpecSchema.parse({
    dataset: "opening_kill",
    teamId: 1,
    metrics: [{ metric: "first_deaths", agg: "sum" }],
    ...partial,
  });
}

describe("computed aggregator (opening kills)", () => {
  it("ranks our players by first-death count", () => {
    const { rows } = aggregateComputed(
      OPENING_KILLS,
      spec({
        dimensions: ["player"],
        filters: [{ field: "side", op: "eq", value: "us" }],
        sort: { key: "sum__first_deaths", dir: "desc" },
      })
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].player).toBe("PGE");
    expect(rows[0]["sum__first_deaths"]).toBe(2);
  });

  it("ranks our opening picks by attacker", () => {
    const { rows } = aggregateComputed(
      OPENING_KILLS,
      spec({
        metrics: [{ metric: "first_picks", agg: "sum" }],
        dimensions: ["attacker"],
        filters: [{ field: "attacker_side", op: "eq", value: "us" }],
        sort: { key: "sum__first_picks", dir: "desc" },
      })
    );

    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.attacker).sort()).toEqual(["Landon", "PGE"]);
    expect(rows.every((row) => row["sum__first_picks"] === 1)).toBe(true);
  });

  it("answers win rate when a player dies first", () => {
    const { rows } = aggregateComputed(
      OPENING_KILLS,
      spec({
        metrics: [
          { metric: "win_rate", agg: "avg" },
          { metric: "first_events", agg: "count" },
        ],
        filters: [
          { field: "player", op: "in", value: ["PGE"] },
          { field: "side", op: "eq", value: "us" },
        ],
      })
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]["count__first_events"]).toBe(2);
    expect(rows[0]["avg__win_rate"]).toBe(50);
  });

  it("filters grouped opening-kill metrics after aggregation", () => {
    const { rows } = aggregateComputed(
      OPENING_KILLS,
      spec({
        metrics: [
          { metric: "first_deaths", agg: "sum" },
          { metric: "win_rate", agg: "avg" },
        ],
        dimensions: ["player"],
        filters: [
          { field: "side", op: "eq", value: "us" },
          { field: "first_deaths", op: "gte", value: 2 },
          { field: "win_rate", op: "lte", value: 50 },
        ],
      })
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].player).toBe("PGE");
    expect(rows[0]["sum__first_deaths"]).toBe(2);
    expect(rows[0]["avg__win_rate"]).toBe(50);
  });

  it("filters grouped opening-pick timing after aggregation", () => {
    const { rows } = aggregateComputed(
      OPENING_KILLS,
      spec({
        metrics: [
          { metric: "first_picks", agg: "sum" },
          { metric: "fight_time", agg: "avg" },
        ],
        dimensions: ["attacker"],
        filters: [
          { field: "attacker_side", op: "eq", value: "us" },
          { field: "avg_fight_time", op: "lt", value: 5 },
        ],
      })
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].attacker).toBe("Landon");
    expect(rows[0]["sum__first_picks"]).toBe(1);
    expect(rows[0]["avg__fight_time"]).toBe(4);
  });

  it("filters grouped opening-kill match timing after aggregation", () => {
    const { rows } = aggregateComputed(
      OPENING_KILLS,
      spec({
        metrics: [{ metric: "kill_time", agg: "avg" }],
        dimensions: ["map"],
        filters: [{ field: "avg_kill_time", op: "gt", value: 100 }],
      })
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].map).toBe("Lijiang Tower");
    expect(rows[0]["avg__kill_time"]).toBe(139);
  });
});
