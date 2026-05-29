import { planQueryFromQuestion } from "@/lib/query-builder/natural-language";
import { metricKey } from "@/lib/query-builder/types";
import { describe, expect, it } from "vitest";

describe("query-builder natural-language planner", () => {
  it("plans the PGE Widowmaker final-blows versus time-played question", () => {
    const planned = planQueryFromQuestion({
      teamId: 7,
      question:
        "I need you to find a stat for me. I need to know the number of Final blows PGE has on widowmaker versus the time he has played it in scrims",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "player_stat",
      teamId: 7,
      metrics: [
        { metric: "final_blows", agg: "sum" },
        { metric: "time_played", agg: "sum" },
      ],
      dimensions: [],
      filters: [
        { field: "hero", op: "in", value: ["Widowmaker"] },
        { field: "player", op: "in", value: ["PGE"] },
      ],
      timeScope: { kind: "all" },
      sort: null,
      limit: null,
    });
  });

  it("plans extended fight winrate questions onto computed teamfight fields", () => {
    const planned = planQueryFromQuestion({
      teamId: 4,
      question: "What is our fight win rate when we have first death?",
    });

    expect(planned?.spec.dataset).toBe("teamfight");
    expect(planned?.spec.metrics.map(metricKey)).toContain("avg__win_rate");
    expect(planned?.spec.filters).toContainEqual({
      field: "first_death",
      op: "eq",
      value: "yes",
    });
  });

  it("plans ranked map-result questions with grouping, sorting, and limits", () => {
    const planned = planQueryFromQuestion({
      teamId: 2,
      question: "Which maps have our top 5 map win rates?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "map_result",
      dimensions: ["map"],
      sort: { key: "avg__win_rate", dir: "desc" },
      limit: 5,
    });
  });

  it("plans ability-impact questions from ability aliases", () => {
    const planned = planQueryFromQuestion({
      teamId: 9,
      question: "How does using Suzu affect our fight win rate?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "ability_impact",
      metrics: [{ metric: "win_rate", agg: "avg" }],
      dimensions: ["used"],
      filters: [
        { field: "hero", op: "in", value: ["Kiriko"] },
        { field: "ability", op: "in", value: ["Protection Suzu"] },
        { field: "side", op: "eq", value: "us" },
      ],
    });
  });

  it("plans swap-impact questions onto swap buckets", () => {
    const planned = planQueryFromQuestion({
      teamId: 3,
      question: "What is our win rate when we swap?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "swap_impact",
      metrics: [{ metric: "win_rate", agg: "avg" }],
      dimensions: ["swap_count_bucket"],
      filters: [{ field: "had_swap", op: "eq", value: "yes" }],
    });
  });

  it("plans hero-pool questions onto hero winrates", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question: "What are our top hero win rates for Damage heroes?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "hero_pool",
      metrics: [{ metric: "win_rate", agg: "avg" }],
      dimensions: ["hero"],
      filters: [{ field: "role", op: "in", value: ["Damage"] }],
      sort: { key: "avg__win_rate", dir: "desc" },
      limit: 20,
    });
  });

  it("plans role-performance per-10 questions onto weighted hero-pool metrics", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question: "What is our damage per 10 by role?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "hero_pool",
      metrics: [{ metric: "hero_damage", agg: "per10" }],
      dimensions: ["role"],
      filters: [],
    });
  });

  it("plans ultimate-efficiency questions onto ratio metrics", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question: "Which heroes have the best ultimate efficiency?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "hero_pool",
      metrics: [{ metric: "ult_efficiency", agg: "ratio" }],
      dimensions: ["hero"],
      sort: { key: "ratio__ult_efficiency", dir: "desc" },
      limit: 20,
    });
  });

  it("plans enemy-hero matchup questions with hero filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 8,
      question: "What is our win rate against Tracer?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "enemy_hero",
      metrics: [{ metric: "win_rate", agg: "avg" }],
      dimensions: [],
      filters: [{ field: "enemy_hero", op: "in", value: ["Tracer"] }],
    });
  });

  it("plans worst enemy hero questions as ranked matchup groups", () => {
    const planned = planQueryFromQuestion({
      teamId: 8,
      question: "Which enemy heroes are worst for us?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "enemy_hero",
      metrics: [{ metric: "win_rate", agg: "avg" }],
      dimensions: ["enemy_hero"],
      sort: { key: "avg__win_rate", dir: "asc" },
      limit: 20,
    });
  });

  it("plans ban weak-point questions onto received ban impact", () => {
    const planned = planQueryFromQuestion({
      teamId: 8,
      question: "Which heroes are weak points when the opponent bans them?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "ban_impact",
      metrics: [
        { metric: "win_rate_delta", agg: "avg" },
        { metric: "maps_banned", agg: "sum" },
      ],
      dimensions: ["hero"],
      filters: [
        { field: "side", op: "eq", value: "banned by enemy" },
        { field: "tag", op: "eq", value: "weak point" },
      ],
    });
  });

  it("plans most-banned-by-us questions onto outgoing ban rates", () => {
    const planned = planQueryFromQuestion({
      teamId: 8,
      question: "What are our most banned heroes by us?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "ban_impact",
      metrics: [{ metric: "ban_rate", agg: "avg" }],
      dimensions: ["hero"],
      filters: [{ field: "side", op: "eq", value: "banned by us" }],
      sort: { key: "avg__ban_rate", dir: "desc" },
      limit: 20,
    });
  });

  it("plans ult-combo questions onto weighted combo win rates", () => {
    const planned = planQueryFromQuestion({
      teamId: 8,
      question: "What are our best ult combos with Zarya?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "ult_combo",
      metrics: [{ metric: "win_rate", agg: "ratio" }],
      dimensions: ["combo"],
      filters: [
        { field: "hero", op: "in", value: ["Zarya"] },
        { field: "type", op: "eq", value: "combo" },
      ],
      sort: { key: "ratio__win_rate", dir: "desc" },
      limit: 20,
    });
  });

  it("plans counter-ult response questions onto response rows", () => {
    const planned = planQueryFromQuestion({
      teamId: 8,
      question: "How often do we counter ult against Reinhardt?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "ult_combo",
      metrics: [{ metric: "uses", agg: "sum" }],
      dimensions: ["enemy_hero", "response_hero"],
      filters: [
        { field: "hero", op: "in", value: ["Reinhardt"] },
        { field: "type", op: "eq", value: "response" },
        { field: "enemy_hero", op: "in", value: ["Reinhardt"] },
      ],
    });
  });

  it("plans lineup questions onto role trios", () => {
    const planned = planQueryFromQuestion({
      teamId: 8,
      question: "What are our best lineups with PGE?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "role_trio",
      metrics: [{ metric: "win_rate", agg: "ratio" }],
      dimensions: ["trio"],
      filters: [{ field: "player", op: "in", value: ["PGE"] }],
      sort: { key: "ratio__win_rate", dir: "desc" },
      limit: 20,
    });
  });

  it("plans ultimate-impact questions onto hero scenarios", () => {
    const planned = planQueryFromQuestion({
      teamId: 8,
      question: "What is our win rate when we use Genji ult?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "ult_impact",
      metrics: [{ metric: "win_rate", agg: "ratio" }],
      dimensions: ["scenario"],
      filters: [
        { field: "hero", op: "in", value: ["Genji"] },
        { field: "side", op: "in", value: ["us", "both"] },
      ],
    });
  });

  it("plans mirrored enemy ultimate questions onto first-side filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 8,
      question: "What happens in mirror ult fights when enemy ults first?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "ult_impact",
      metrics: [
        { metric: "win_rate", agg: "ratio" },
        { metric: "fights", agg: "sum" },
      ],
      dimensions: ["hero"],
      filters: [
        { field: "side", op: "in", value: ["enemy", "both"] },
        { field: "mirrored", op: "eq", value: "yes" },
        { field: "first_side", op: "eq", value: "enemy" },
      ],
    });
  });

  it("plans player ult-usage questions onto ult usage summaries", () => {
    const planned = planQueryFromQuestion({
      teamId: 8,
      question: "Who has the most ults per map?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "ult_usage",
      metrics: [
        { metric: "ults_per_map", agg: "avg" },
        { metric: "ults_used", agg: "sum" },
      ],
      dimensions: ["player"],
      filters: [{ field: "row_type", op: "eq", value: "player" }],
      sort: { key: "avg__ults_per_map", dir: "desc" },
      limit: 20,
    });
  });

  it("plans fight-opening hero questions onto ult usage summaries", () => {
    const planned = planQueryFromQuestion({
      teamId: 8,
      question: "Which heroes open fights with ult the most?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "ult_usage",
      metrics: [{ metric: "fight_openings", agg: "sum" }],
      dimensions: ["hero"],
      filters: [{ field: "row_type", op: "eq", value: "fight opening hero" }],
      sort: { key: "sum__fight_openings", dir: "desc" },
      limit: 20,
    });
  });
});
