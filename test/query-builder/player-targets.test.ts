import {
  aggregateComputed,
  type ComputedRow,
} from "@/lib/query-builder/aggregate";
import { querySpecSchema, type QuerySpec } from "@/lib/query-builder/types";
import { describe, expect, it } from "vitest";

const PLAYER_TARGET_ROWS: ComputedRow[] = [
  {
    target_id: 1,
    player: "PGE",
    stat: "Final Blows/10",
    stat_key: "final_blows",
    direction: "increase",
    trending: "toward",
    status: "on track",
    current_value: 8,
    baseline_value: 6,
    target_value: 9,
    gap_to_target: 1,
    progress_percent: 66.6667,
    target_percent: 50,
    scrim_window: 10,
    sample_scrims: 5,
  },
  {
    target_id: 2,
    player: "Landon",
    stat: "Deaths/10",
    stat_key: "deaths",
    direction: "decrease",
    trending: "away",
    status: "off track",
    current_value: 5.5,
    baseline_value: 5,
    target_value: 4,
    gap_to_target: 1.5,
    progress_percent: 0,
    target_percent: 20,
    scrim_window: 10,
    sample_scrims: 5,
  },
];

function spec(partial: Partial<QuerySpec>): QuerySpec {
  return querySpecSchema.parse({
    dataset: "player_target",
    teamId: 1,
    metrics: [{ metric: "progress_percent", agg: "avg" }],
    ...partial,
  });
}

describe("computed aggregator (player targets)", () => {
  it("ranks player targets by progress", () => {
    const { rows } = aggregateComputed(
      PLAYER_TARGET_ROWS,
      spec({
        dimensions: ["player"],
        sort: { key: "avg__progress_percent", dir: "asc" },
      })
    );

    expect(rows.map((row) => row.player)).toEqual(["Landon", "PGE"]);
  });

  it("filters off-track targets", () => {
    const { rows } = aggregateComputed(
      PLAYER_TARGET_ROWS,
      spec({
        dimensions: ["player"],
        filters: [{ field: "status", op: "in", value: ["off track"] }],
      })
    );

    expect(rows).toEqual([{ player: "Landon", avg__progress_percent: 0 }]);
  });

  it("drills into a player's target stats", () => {
    const { rows } = aggregateComputed(
      PLAYER_TARGET_ROWS,
      spec({
        metrics: [{ metric: "gap_to_target", agg: "avg" }],
        dimensions: ["stat"],
        filters: [{ field: "player", op: "in", value: ["PGE"] }],
      })
    );

    expect(rows).toEqual([{ stat: "Final Blows/10", avg__gap_to_target: 1 }]);
  });

  it("applies grouped metric filters to target progress thresholds", () => {
    const { rows } = aggregateComputed(
      PLAYER_TARGET_ROWS,
      spec({
        metrics: [
          { metric: "progress_percent", agg: "avg" },
          { metric: "sample_scrims", agg: "max" },
        ],
        dimensions: ["player"],
        filters: [
          { field: "progress_percent", op: "gte", value: 50 },
          { field: "sample_scrims", op: "gte", value: 5 },
        ],
      })
    );

    expect(rows).toEqual([
      {
        player: "PGE",
        avg__progress_percent: 66.6667,
        max__sample_scrims: 5,
      },
    ]);
  });

  it("applies grouped metric filters to target value thresholds", () => {
    const { rows } = aggregateComputed(
      PLAYER_TARGET_ROWS,
      spec({
        metrics: [
          { metric: "target_value", agg: "avg" },
          { metric: "scrim_window", agg: "max" },
        ],
        dimensions: ["player"],
        filters: [
          { field: "target_value", op: "gte", value: 8 },
          { field: "scrim_window", op: "gte", value: 10 },
        ],
      })
    );

    expect(rows).toEqual([
      {
        player: "PGE",
        avg__target_value: 9,
        max__scrim_window: 10,
      },
    ]);
  });
});
