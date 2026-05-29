import {
  aggregateComputed,
  type ComputedRow,
} from "@/lib/query-builder/aggregate";
import { querySpecSchema, type QuerySpec } from "@/lib/query-builder/types";
import { describe, expect, it } from "vitest";

const BAN_ROWS: ComputedRow[] = [
  {
    hero: "Widowmaker",
    side: "banned by enemy",
    tag: "weak point",
    ban_rate: 0.5,
    maps_played: 10,
    maps_banned: 5,
    total_bans: 5,
    win_rate_with: 0.7,
    win_rate_without: 0.3,
    win_rate_delta: 0.4,
  },
  {
    hero: "Tracer",
    side: "banned by us",
    tag: "strong ban",
    ban_rate: 0.4,
    maps_played: 10,
    maps_banned: 4,
    total_bans: 4,
    win_rate_with: 0.75,
    win_rate_without: 0.45,
    win_rate_delta: 0.3,
  },
  {
    hero: "Sombra",
    side: "banned by us",
    tag: "normal",
    ban_rate: 0.3,
    maps_played: 10,
    maps_banned: 3,
    total_bans: 3,
    win_rate_with: 0.5,
    win_rate_without: 0.55,
    win_rate_delta: -0.05,
  },
];

function spec(partial: Partial<QuerySpec>): QuerySpec {
  return querySpecSchema.parse({
    dataset: "ban_impact",
    teamId: 1,
    metrics: [{ metric: "win_rate_delta", agg: "avg" }],
    ...partial,
  });
}

describe("computed aggregator (ban impact)", () => {
  it("answers weak-point ban impact questions", () => {
    const { rows } = aggregateComputed(
      BAN_ROWS,
      spec({
        metrics: [
          { metric: "win_rate_delta", agg: "avg" },
          { metric: "maps_banned", agg: "sum" },
        ],
        filters: [
          { field: "side", op: "eq", value: "banned by enemy" },
          { field: "tag", op: "eq", value: "weak point" },
        ],
      })
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]["avg__win_rate_delta"]).toBe(40);
    expect(rows[0]["sum__maps_banned"]).toBe(5);
  });

  it("ranks outgoing bans by ban rate", () => {
    const { rows } = aggregateComputed(
      BAN_ROWS,
      spec({
        metrics: [{ metric: "ban_rate", agg: "avg" }],
        dimensions: ["hero"],
        filters: [{ field: "side", op: "eq", value: "banned by us" }],
        sort: { key: "avg__ban_rate", dir: "desc" },
      })
    );

    expect(rows.map((row) => row.hero)).toEqual(["Tracer", "Sombra"]);
    expect(rows[0]["avg__ban_rate"]).toBe(40);
  });
});
