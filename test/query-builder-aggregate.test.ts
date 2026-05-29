import {
  aggregateComputed,
  type ComputedRow,
} from "@/lib/query-builder/aggregate";
import { querySpecSchema, type QuerySpec } from "@/lib/query-builder/types";
import { describe, expect, it } from "vitest";

const FIGHTS: ComputedRow[] = [
  {
    won: 1,
    lost: 0,
    duration: 18,
    ults_used: 2,
    won_ults_used: 2,
    lost_ults_used: 0,
    wasted_ults: 0,
    first_pick_value: 1,
    first_death_value: 0,
    first_ult_value: 1,
    dry_fight_value: 0,
    reversal_value: 0,
    dry_reversal_value: 0,
    non_dry_fight_value: 1,
    non_dry_reversal_value: 0,
    result: "win",
    first_pick: "yes",
    first_death: "no",
    first_ult: "yes",
    dry_fight: "no",
    reversal: "no",
    map: "Lijiang Tower",
    map_type: "Control",
    scrim: "A",
  },
  {
    won: 0,
    lost: 1,
    duration: 24,
    ults_used: 2,
    won_ults_used: 0,
    lost_ults_used: 2,
    wasted_ults: 1,
    first_pick_value: 0,
    first_death_value: 1,
    first_ult_value: 0,
    dry_fight_value: 0,
    reversal_value: 0,
    dry_reversal_value: 0,
    non_dry_fight_value: 1,
    non_dry_reversal_value: 0,
    result: "loss",
    first_pick: "no",
    first_death: "yes",
    first_ult: "no",
    dry_fight: "no",
    reversal: "no",
    map: "Lijiang Tower",
    map_type: "Control",
    scrim: "A",
  },
  {
    won: 1,
    lost: 0,
    duration: 12,
    ults_used: 2,
    won_ults_used: 2,
    lost_ults_used: 0,
    wasted_ults: 0,
    first_pick_value: 1,
    first_death_value: 0,
    first_ult_value: 0,
    dry_fight_value: 0,
    reversal_value: 1,
    dry_reversal_value: 0,
    non_dry_fight_value: 1,
    non_dry_reversal_value: 1,
    result: "win",
    first_pick: "yes",
    first_death: "no",
    first_ult: "no",
    dry_fight: "no",
    reversal: "yes",
    map: "King's Row",
    map_type: "Hybrid",
    scrim: "B",
  },
  {
    won: 0,
    lost: 1,
    duration: 16,
    ults_used: 0,
    won_ults_used: 0,
    lost_ults_used: 0,
    wasted_ults: 0,
    first_pick_value: 0,
    first_death_value: 1,
    first_ult_value: 0,
    dry_fight_value: 1,
    reversal_value: 0,
    dry_reversal_value: 0,
    non_dry_fight_value: 0,
    non_dry_reversal_value: 0,
    result: "loss",
    first_pick: "no",
    first_death: "yes",
    first_ult: "no",
    dry_fight: "yes",
    reversal: "no",
    map: "Lijiang Tower",
    map_type: "Control",
    scrim: "A",
  },
  {
    won: 1,
    lost: 0,
    duration: 10,
    ults_used: 1,
    won_ults_used: 1,
    lost_ults_used: 0,
    wasted_ults: 0,
    first_pick_value: 0,
    first_death_value: 0,
    first_ult_value: 1,
    dry_fight_value: 0,
    reversal_value: 0,
    dry_reversal_value: 0,
    non_dry_fight_value: 1,
    non_dry_reversal_value: 0,
    result: "win",
    first_pick: "no",
    first_death: "no",
    first_ult: "yes",
    dry_fight: "no",
    reversal: "no",
    map: "Colosseo",
    map_type: "Push",
    scrim: "C",
  },
];

function spec(partial: Partial<QuerySpec>): QuerySpec {
  return querySpecSchema.parse({
    dataset: "teamfight",
    teamId: 1,
    metrics: [{ metric: "win_rate", agg: "avg" }],
    ...partial,
  });
}

describe("computed aggregator (teamfights)", () => {
  it("computes win rate and fight counts grouped by ultimates used", () => {
    const { columns, rows } = aggregateComputed(
      FIGHTS,
      spec({
        metrics: [
          { metric: "win_rate", agg: "avg" },
          { metric: "fights", agg: "count" },
        ],
        dimensions: ["ults_used"],
        sort: { key: "ults_used", dir: "asc" },
      })
    );

    expect(columns.map((c) => c.key)).toEqual([
      "ults_used",
      "avg__win_rate",
      "count__fights",
    ]);

    const byUlts = Object.fromEntries(rows.map((r) => [r.ults_used, r]));
    // 0 ults: 1 fight, lost
    expect(byUlts["0"]["count__fights"]).toBe(1);
    expect(byUlts["0"]["avg__win_rate"]).toBe(0);
    // 1 ult: 1 fight, won
    expect(byUlts["1"]["avg__win_rate"]).toBe(100);
    // 2 ults: 3 fights, 2 wins -> 66.67%
    expect(byUlts["2"]["count__fights"]).toBe(3);
    expect(byUlts["2"]["avg__win_rate"]).toBeCloseTo(66.666, 1);
  });

  it("answers 'win rate when we use exactly 2 ultimates' via a filter", () => {
    const { rows } = aggregateComputed(
      FIGHTS,
      spec({
        metrics: [
          { metric: "win_rate", agg: "avg" },
          { metric: "fights", agg: "count" },
        ],
        filters: [{ field: "ults_used", op: "eq", value: 2 }],
      })
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]["count__fights"]).toBe(3);
    expect(rows[0]["avg__win_rate"]).toBeCloseTo(66.666, 1);
  });

  it("supports numeric threshold filters and win/loss filters", () => {
    const atLeastOne = aggregateComputed(
      FIGHTS,
      spec({
        metrics: [{ metric: "fights", agg: "count" }],
        filters: [{ field: "ults_used", op: "gte", value: 1 }],
      })
    );
    expect(atLeastOne.rows[0]["count__fights"]).toBe(4);

    const onlyWins = aggregateComputed(
      FIGHTS,
      spec({
        metrics: [{ metric: "fights", agg: "count" }],
        filters: [{ field: "result", op: "eq", value: "win" }],
      })
    );
    expect(onlyWins.rows[0]["count__fights"]).toBe(3);
  });

  it("supports extended fight-context filters and wasted ult metrics", () => {
    const firstDeath = aggregateComputed(
      FIGHTS,
      spec({
        metrics: [
          { metric: "win_rate", agg: "avg" },
          { metric: "fights", agg: "count" },
        ],
        filters: [{ field: "first_death", op: "eq", value: "yes" }],
      })
    );
    expect(firstDeath.rows[0]["count__fights"]).toBe(2);
    expect(firstDeath.rows[0]["avg__win_rate"]).toBe(0);

    const dry = aggregateComputed(
      FIGHTS,
      spec({
        metrics: [{ metric: "fights", agg: "count" }],
        filters: [{ field: "dry_fight", op: "eq", value: "yes" }],
      })
    );
    expect(dry.rows[0]["count__fights"]).toBe(1);

    const wasted = aggregateComputed(
      FIGHTS,
      spec({
        metrics: [{ metric: "avg_wasted_ults", agg: "sum" }],
      })
    );
    expect(wasted.rows[0]["sum__avg_wasted_ults"]).toBe(1);
  });

  it("sums fight losses directly", () => {
    const { rows } = aggregateComputed(
      FIGHTS,
      spec({
        metrics: [{ metric: "losses", agg: "sum" }],
        filters: [{ field: "first_death", op: "eq", value: "yes" }],
      })
    );

    expect(rows[0]["sum__losses"]).toBe(2);
  });

  it("filters fight win rate to a specific map", () => {
    const { rows } = aggregateComputed(
      FIGHTS,
      spec({
        metrics: [
          { metric: "win_rate", agg: "avg" },
          { metric: "fights", agg: "count" },
        ],
        filters: [{ field: "map", op: "in", value: ["King's Row"] }],
      })
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]["count__fights"]).toBe(1);
    expect(rows[0]["avg__win_rate"]).toBe(100);
  });

  it("aggregates fight duration by map type", () => {
    const { rows } = aggregateComputed(
      FIGHTS,
      spec({
        metrics: [{ metric: "duration", agg: "avg" }],
        dimensions: ["map_type"],
        sort: { key: "avg__duration", dir: "desc" },
      })
    );

    expect(rows.map((row) => row.map_type)).toEqual([
      "Control",
      "Hybrid",
      "Push",
    ]);
    expect(rows[0]["avg__duration"]).toBeCloseTo((18 + 24 + 16) / 3, 1);
  });

  it("answers team fight service rollup rates", () => {
    const { rows } = aggregateComputed(
      FIGHTS,
      spec({
        metrics: [
          { metric: "first_pick_rate", agg: "avg" },
          { metric: "first_ult_rate", agg: "avg" },
          { metric: "dry_fight_reversal_rate", agg: "ratio" },
          { metric: "non_dry_fight_reversal_rate", agg: "ratio" },
          { metric: "ultimate_efficiency", agg: "ratio" },
          { metric: "avg_ults_per_non_dry_fight", agg: "ratio" },
          { metric: "avg_ults_in_won_fights", agg: "ratio" },
          { metric: "avg_ults_in_lost_fights", agg: "ratio" },
        ],
      })
    );

    expect(rows[0]["avg__first_pick_rate"]).toBe(40);
    expect(rows[0]["avg__first_ult_rate"]).toBe(40);
    expect(rows[0]["ratio__dry_fight_reversal_rate"]).toBe(0);
    expect(rows[0]["ratio__non_dry_fight_reversal_rate"]).toBe(25);
    expect(rows[0]["ratio__ultimate_efficiency"]).toBeCloseTo(3 / 7);
    expect(rows[0]["ratio__avg_ults_per_non_dry_fight"]).toBe(1.75);
    expect(rows[0]["ratio__avg_ults_in_won_fights"]).toBeCloseTo(5 / 3);
    expect(rows[0]["ratio__avg_ults_in_lost_fights"]).toBe(1);
  });
});

describe("computed aggregator (roster membership)", () => {
  const rows: ComputedRow[] = [
    {
      roster: "PGE / Rupal / Vega / Someone / Else",
      player: "Else|PGE|Rupal|Someone|Vega",
      games: 3,
      wins: 2,
      losses: 1,
    },
    {
      roster: "PGE / Vega / Other / Someone / Else",
      player: "Else|Other|PGE|Someone|Vega",
      games: 2,
      wins: 1,
      losses: 1,
    },
    {
      roster: "Rupal / Vega / Other / Someone / Else",
      player: "Else|Other|Rupal|Someone|Vega",
      games: 1,
      wins: 0,
      losses: 1,
    },
  ];

  it("applies repeated membership filters as contains-all constraints", () => {
    const result = aggregateComputed(
      rows,
      querySpecSchema.parse({
        dataset: "roster_variant",
        teamId: 1,
        metrics: [{ metric: "games", agg: "sum" }],
        dimensions: ["roster"],
        filters: [
          { field: "player", op: "eq", value: "PGE" },
          { field: "player", op: "eq", value: "Vega" },
          { field: "player", op: "neq", value: "Rupal" },
        ],
      })
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].roster).toBe("PGE / Vega / Other / Someone / Else");
    expect(result.rows[0]["sum__games"]).toBe(2);
  });
});
