import {
  aggregateComputed,
  type ComputedRow,
} from "@/lib/query-builder/aggregate";
import { querySpecSchema, type QuerySpec } from "@/lib/query-builder/types";
import { describe, expect, it } from "vitest";

const ROTATION_DEATH_ROWS: ComputedRow[] = [
  {
    rotation_death: 1,
    death_type: "rotation",
    early_in_fight: 1,
    low_pre_fight_damage: 1,
    player: "PGE",
    hero: "Widowmaker",
    side: "us",
    attacker: "EnemyTracer",
    attacker_hero: "Tracer",
    attacker_side: "enemy",
    pre_fight_damage_count: 3,
    kill_distance: 24,
    map: "King's Row",
    map_type: "Hybrid",
    scrim: "A",
  },
  {
    rotation_death: 0,
    death_type: "normal",
    early_in_fight: 0,
    low_pre_fight_damage: 0,
    player: "PGE",
    hero: "Widowmaker",
    side: "us",
    attacker: "EnemySojourn",
    attacker_hero: "Sojourn",
    attacker_side: "enemy",
    pre_fight_damage_count: 38,
    kill_distance: 12,
    map: "Lijiang Tower",
    map_type: "Control",
    scrim: "B",
  },
  {
    rotation_death: 1,
    death_type: "rotation",
    early_in_fight: 1,
    low_pre_fight_damage: 1,
    player: "Landon",
    hero: "Kiriko",
    side: "us",
    attacker: "EnemyTracer",
    attacker_hero: "Tracer",
    attacker_side: "enemy",
    pre_fight_damage_count: 5,
    kill_distance: 19,
    map: "King's Row",
    map_type: "Hybrid",
    scrim: "A",
  },
  {
    rotation_death: 1,
    death_type: "rotation",
    early_in_fight: 1,
    low_pre_fight_damage: 1,
    player: "EnemyTracer",
    hero: "Tracer",
    side: "enemy",
    attacker: "PGE",
    attacker_hero: "Widowmaker",
    attacker_side: "us",
    pre_fight_damage_count: 2,
    kill_distance: 31,
    map: "King's Row",
    map_type: "Hybrid",
    scrim: "A",
  },
];

function spec(partial: Partial<QuerySpec>): QuerySpec {
  return querySpecSchema.parse({
    dataset: "rotation_death",
    teamId: 1,
    metrics: [
      { metric: "rotation_deaths", agg: "sum" },
      { metric: "deaths", agg: "count" },
    ],
    ...partial,
  });
}

describe("computed aggregator (rotation deaths)", () => {
  it("ranks our players by rotation-death count", () => {
    const { rows } = aggregateComputed(
      ROTATION_DEATH_ROWS,
      spec({
        dimensions: ["player"],
        filters: [{ field: "side", op: "eq", value: "us" }],
        sort: { key: "sum__rotation_deaths", dir: "desc" },
      })
    );

    expect(rows.map((row) => row.player)).toEqual(["PGE", "Landon"]);
    expect(rows[0]["sum__rotation_deaths"]).toBe(1);
    expect(rows[0]["count__deaths"]).toBe(2);
  });

  it("computes rotation-death rates by player", () => {
    const { rows } = aggregateComputed(
      ROTATION_DEATH_ROWS,
      spec({
        metrics: [{ metric: "rotation_death_rate", agg: "avg" }],
        dimensions: ["player"],
        filters: [{ field: "side", op: "eq", value: "us" }],
        sort: { key: "avg__rotation_death_rate", dir: "desc" },
      })
    );

    expect(rows.map((row) => row.player)).toEqual(["Landon", "PGE"]);
    expect(rows[0]["avg__rotation_death_rate"]).toBe(100);
    expect(rows[1]["avg__rotation_death_rate"]).toBe(50);
  });

  it("groups rotation deaths by attacker hero", () => {
    const { rows } = aggregateComputed(
      ROTATION_DEATH_ROWS,
      spec({
        dimensions: ["attacker_hero"],
        filters: [
          { field: "side", op: "eq", value: "us" },
          { field: "death_type", op: "eq", value: "rotation" },
        ],
        sort: { key: "sum__rotation_deaths", dir: "desc" },
      })
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].attacker_hero).toBe("Tracer");
    expect(rows[0]["sum__rotation_deaths"]).toBe(2);
  });
});
