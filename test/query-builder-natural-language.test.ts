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
        { metric: "final_blows", agg: "per10" },
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

  it("plans rateable player stats versus playtime as raw, time, and per-10 metrics", () => {
    const planned = planQueryFromQuestion({
      teamId: 7,
      question: "Show PGE's hero damage compared to playtime on Tracer",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "player_stat",
      teamId: 7,
      metrics: [
        { metric: "hero_damage", agg: "sum" },
        { metric: "time_played", agg: "sum" },
        { metric: "hero_damage", agg: "per10" },
      ],
      dimensions: [],
      filters: [
        { field: "hero", op: "in", value: ["Tracer"] },
        { field: "player", op: "in", value: ["PGE"] },
      ],
    });
  });

  it("plans scoped accuracy questions onto player stat ratio metrics", () => {
    const planned = planQueryFromQuestion({
      teamId: 7,
      question: "Which players have the highest scoped accuracy on Widowmaker?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "player_stat",
      teamId: 7,
      metrics: [{ metric: "scoped_accuracy", agg: "ratio" }],
      dimensions: ["player"],
      filters: [{ field: "hero", op: "in", value: ["Widowmaker"] }],
      sort: { key: "ratio__scoped_accuracy", dir: "desc" },
      limit: 20,
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

  it("plans exact ultimate-count fight winrate questions", () => {
    const planned = planQueryFromQuestion({
      teamId: 4,
      question: "What is our fight win rate when we use exactly 2 ultimates?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "teamfight",
      metrics: [{ metric: "win_rate", agg: "avg" }],
      dimensions: [],
      filters: [{ field: "ults_used", op: "eq", value: 2 }],
    });
  });

  it("plans threshold ultimate-count fight winrate questions", () => {
    const planned = planQueryFromQuestion({
      teamId: 4,
      question: "What is our fight win rate when we use at least one ult?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "teamfight",
      metrics: [{ metric: "win_rate", agg: "avg" }],
      dimensions: [],
      filters: [{ field: "ults_used", op: "gte", value: 1 }],
    });
  });

  it("plans first-ult and wasted-ult fight context questions", () => {
    const planned = planQueryFromQuestion({
      teamId: 4,
      question:
        "What is our fight win rate when we get first ult and waste an ult?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "teamfight",
      metrics: [{ metric: "win_rate", agg: "avg" }],
      dimensions: [],
      filters: [
        { field: "first_ult", op: "eq", value: "yes" },
        { field: "wasted_ults", op: "gte", value: 1 },
      ],
    });
  });

  it("plans fight-loss count questions onto computed teamfight fields", () => {
    const planned = planQueryFromQuestion({
      teamId: 4,
      question: "How many fights did we lose when we get first death?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "teamfight",
      dimensions: [],
      filters: [{ field: "first_death", op: "eq", value: "yes" }],
    });
    expect(planned?.spec.metrics[0]).toEqual({ metric: "losses", agg: "sum" });
  });

  it("plans specific-map fight winrate questions onto teamfights", () => {
    const planned = planQueryFromQuestion({
      teamId: 4,
      question:
        "What is our fight win rate on King's Row when we get first pick?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "teamfight",
      metrics: [{ metric: "win_rate", agg: "avg" }],
      dimensions: [],
      filters: [
        { field: "map", op: "in", value: ["King's Row"] },
        { field: "first_pick", op: "eq", value: "yes" },
      ],
    });
  });

  it("plans average fight-duration questions onto teamfights", () => {
    const planned = planQueryFromQuestion({
      teamId: 4,
      question: "What is our average fight duration by map type?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "teamfight",
      metrics: [{ metric: "duration", agg: "avg" }],
      dimensions: ["map_type"],
    });
  });

  it("plans ranked rotation-death questions by player", () => {
    const planned = planQueryFromQuestion({
      teamId: 4,
      question: "Who has the most rotation deaths?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "rotation_death",
      dimensions: ["player"],
      filters: [{ field: "side", op: "eq", value: "us" }],
      sort: { key: "sum__rotation_deaths", dir: "desc" },
      limit: 20,
    });
    expect(planned?.spec.metrics[0]).toEqual({
      metric: "rotation_deaths",
      agg: "sum",
    });
  });

  it("plans rotation-death rate questions by map", () => {
    const planned = planQueryFromQuestion({
      teamId: 4,
      question: "Which maps have the highest rotation death rate?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "rotation_death",
      dimensions: ["map"],
      filters: [{ field: "side", op: "eq", value: "us" }],
      sort: { key: "avg__rotation_death_rate", dir: "desc" },
      limit: 20,
    });
    expect(planned?.spec.metrics[0]).toEqual({
      metric: "rotation_death_rate",
      agg: "avg",
    });
  });

  it("plans specific-map enemy hero questions onto enemy matchups", () => {
    const planned = planQueryFromQuestion({
      teamId: 4,
      question: "What is our win rate against Tracer on King's Row?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "enemy_hero",
      metrics: [{ metric: "win_rate", agg: "avg" }],
      dimensions: [],
      filters: [
        { field: "enemy_hero", op: "in", value: ["Tracer"] },
        { field: "map", op: "in", value: ["King's Row"] },
      ],
    });
  });

  it("plans specific-map swap questions onto swap impact", () => {
    const planned = planQueryFromQuestion({
      teamId: 4,
      question: "What is our win rate when we swap on King's Row?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "swap_impact",
      metrics: [{ metric: "win_rate", agg: "avg" }],
      dimensions: ["swap_count_bucket"],
      filters: [
        { field: "map", op: "in", value: ["King's Row"] },
        { field: "had_swap", op: "eq", value: "yes" },
      ],
    });
  });

  it("plans specific-map recent form questions onto trends", () => {
    const planned = planQueryFromQuestion({
      teamId: 4,
      question: "What is our recent form on King's Row?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "trend",
      metrics: [{ metric: "win_rate", agg: "avg" }],
      dimensions: ["date"],
      filters: [{ field: "map", op: "in", value: ["King's Row"] }],
    });
  });

  it("plans ult-economy advantage questions onto advantage buckets", () => {
    const planned = planQueryFromQuestion({
      teamId: 4,
      question: "What is our fight win rate when we are one ult ahead?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "ult_economy",
      metrics: [{ metric: "win_rate", agg: "avg" }],
      dimensions: [],
      filters: [{ field: "advantage_bucket", op: "in", value: ["1 ahead"] }],
    });
  });

  it("plans per-player first-pick rate questions onto calculated stats", () => {
    const planned = planQueryFromQuestion({
      teamId: 4,
      question: "Who has the highest first pick rate?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "calculated_stat",
      metrics: [{ metric: "first_pick_pct", agg: "avg" }],
      dimensions: ["player"],
      sort: { key: "avg__first_pick_pct", dir: "desc" },
      limit: 20,
    });
  });

  it("plans worst first-death rate questions as high lower-is-better stats", () => {
    const planned = planQueryFromQuestion({
      teamId: 4,
      question: "Which players have the worst first death rate?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "calculated_stat",
      metrics: [{ metric: "first_death_pct", agg: "avg" }],
      dimensions: ["player"],
      sort: { key: "avg__first_death_pct", dir: "desc" },
      limit: 20,
    });
  });

  it("plans first-death count questions onto opening kills", () => {
    const planned = planQueryFromQuestion({
      teamId: 4,
      question: "Which players have the most first deaths?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "opening_kill",
      metrics: [{ metric: "first_deaths", agg: "sum" }],
      dimensions: ["player"],
      filters: [{ field: "side", op: "eq", value: "us" }],
      sort: { key: "sum__first_deaths", dir: "desc" },
      limit: 20,
    });
  });

  it("plans first-pick attribution questions onto opening kills", () => {
    const planned = planQueryFromQuestion({
      teamId: 4,
      question: "Who gets first pick most?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "opening_kill",
      metrics: [{ metric: "first_picks", agg: "sum" }],
      dimensions: ["attacker"],
      filters: [{ field: "attacker_side", op: "eq", value: "us" }],
      sort: { key: "sum__first_picks", dir: "desc" },
      limit: 20,
    });
  });

  it("plans player-specific dies-first winrate questions", () => {
    const planned = planQueryFromQuestion({
      teamId: 4,
      question: "What is our win rate when PGE dies first on Widowmaker?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "opening_kill",
      dimensions: [],
      filters: [
        { field: "hero", op: "in", value: ["Widowmaker"] },
        { field: "player", op: "in", value: ["PGE"] },
        { field: "side", op: "eq", value: "us" },
      ],
    });
    expect(planned?.spec.metrics[0]).toEqual({
      metric: "win_rate",
      agg: "avg",
    });
  });

  it("plans fastest ultimate-charge questions as lower-is-better stats", () => {
    const planned = planQueryFromQuestion({
      teamId: 4,
      question: "Which players have the fastest ult charge time?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "calculated_stat",
      metrics: [{ metric: "ult_charge_time", agg: "avg" }],
      dimensions: ["player"],
      sort: { key: "avg__ult_charge_time", dir: "asc" },
      limit: 20,
    });
  });

  it("plans per-player duel winrate questions onto calculated stats", () => {
    const planned = planQueryFromQuestion({
      teamId: 4,
      question: "Who has the highest duel winrate?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "calculated_stat",
      metrics: [{ metric: "duel_winrate", agg: "avg" }],
      dimensions: ["player"],
      sort: { key: "avg__duel_winrate", dir: "desc" },
      limit: 20,
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

  it("plans opponent-filtered map-result questions", () => {
    const planned = planQueryFromQuestion({
      teamId: 2,
      question: "What is our map win rate against NRG?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "map_result",
      metrics: [{ metric: "win_rate", agg: "avg" }],
      dimensions: [],
      filters: [{ field: "opponent", op: "in", value: ["NRG"] }],
    });
  });

  it("plans best maps against an opponent", () => {
    const planned = planQueryFromQuestion({
      teamId: 2,
      question: "Which maps are best against team peps?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "map_result",
      metrics: [{ metric: "win_rate", agg: "avg" }],
      dimensions: ["map"],
      filters: [{ field: "opponent", op: "in", value: ["Team Peps"] }],
      sort: { key: "avg__win_rate", dir: "desc" },
      limit: 20,
    });
  });

  it("plans team-vs-opponent performance comparisons", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question: "Compare our team final blows per 10 vs the opponent",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "team_performance",
      metrics: [{ metric: "final_blows_per10", agg: "ratio" }],
      dimensions: ["side"],
      filters: [],
    });
  });

  it("plans our-team calculated aggregate questions", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question: "What is our team first pick rate?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "team_performance",
      metrics: [{ metric: "first_pick_percentage", agg: "avg" }],
      dimensions: [],
      filters: [{ field: "side", op: "in", value: ["our team"] }],
    });
  });

  it("plans map-type winrate questions onto map results", () => {
    const planned = planQueryFromQuestion({
      teamId: 2,
      question: "What is our win rate by map type?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "map_result",
      metrics: [{ metric: "win_rate", agg: "avg" }],
      dimensions: ["map_type"],
      filters: [],
    });
  });

  it("plans best map-mode questions as ranked map-type winrates", () => {
    const planned = planQueryFromQuestion({
      teamId: 2,
      question: "What is our best map mode?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "map_result",
      metrics: [{ metric: "win_rate", agg: "avg" }],
      dimensions: ["map_type"],
      sort: { key: "avg__win_rate", dir: "desc" },
      limit: 20,
    });
  });

  it("plans weighted map intelligence questions by map", () => {
    const planned = planQueryFromQuestion({
      teamId: 2,
      question: "Which maps have our best time-decayed win rate?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "map_intelligence",
      metrics: [{ metric: "weighted_win_rate", agg: "ratio" }],
      dimensions: ["map"],
      sort: { key: "ratio__weighted_win_rate", dir: "desc" },
      limit: 20,
    });
  });

  it("plans map trend questions onto trend delta", () => {
    const planned = planQueryFromQuestion({
      teamId: 2,
      question: "Which maps are improving?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "map_intelligence",
      metrics: [{ metric: "trend_delta", agg: "avg" }],
      dimensions: ["map"],
      filters: [{ field: "trend", op: "in", value: ["improving"] }],
      sort: { key: "avg__trend_delta", dir: "desc" },
      limit: 20,
    });
  });

  it("plans map-type dependency questions by map type", () => {
    const planned = planQueryFromQuestion({
      teamId: 2,
      question: "What are our map type dependencies?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "map_intelligence",
      metrics: [{ metric: "weighted_win_rate", agg: "ratio" }],
      dimensions: ["map_type"],
    });
  });

  it("plans specific-map winrate questions onto map results", () => {
    const planned = planQueryFromQuestion({
      teamId: 2,
      question: "What is our win rate on King's Row?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "map_result",
      metrics: [{ metric: "win_rate", agg: "avg" }],
      dimensions: [],
      filters: [{ field: "map", op: "in", value: ["King's Row"] }],
    });
  });

  it("plans top played map questions onto map result playtime", () => {
    const planned = planQueryFromQuestion({
      teamId: 2,
      question: "Which maps have we played the most?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "map_result",
      metrics: [{ metric: "playtime", agg: "sum" }],
      dimensions: ["map"],
      sort: { key: "sum__playtime", dir: "desc" },
      limit: 20,
    });
  });

  it("plans specific-map time questions onto map result playtime", () => {
    const planned = planQueryFromQuestion({
      teamId: 2,
      question: "How much time have we played on King's Row?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "map_result",
      metrics: [{ metric: "playtime", agg: "sum" }],
      dimensions: [],
      filters: [{ field: "map", op: "in", value: ["King's Row"] }],
    });
  });

  it("plans player map-specialist questions onto player-map performance", () => {
    const planned = planQueryFromQuestion({
      teamId: 2,
      question: "Which players perform best on Circuit Royal?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "player_map_performance",
      metrics: [{ metric: "win_rate", agg: "ratio" }],
      dimensions: ["player"],
      filters: [{ field: "map", op: "in", value: ["Circuit Royal"] }],
      sort: { key: "ratio__win_rate", dir: "desc" },
      limit: 20,
    });
  });

  it("plans player-filtered map performance questions by map", () => {
    const planned = planQueryFromQuestion({
      teamId: 2,
      question: "What is PGE's map performance by map?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "player_map_performance",
      metrics: [{ metric: "win_rate", agg: "ratio" }],
      dimensions: ["map"],
      filters: [{ field: "player", op: "in", value: ["PGE"] }],
    });
  });

  it("plans player hero-pickrate questions by hero", () => {
    const planned = planQueryFromQuestion({
      teamId: 2,
      question: "What is PGE's hero pickrate by hero?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "hero_pickrate",
      metrics: [{ metric: "pick_rate", agg: "ratio" }],
      dimensions: ["hero"],
      filters: [{ field: "player", op: "in", value: ["PGE"] }],
    });
  });

  it("plans hero ownership questions by player", () => {
    const planned = planQueryFromQuestion({
      teamId: 2,
      question: "Who owns our Widowmaker playtime?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "hero_pickrate",
      dimensions: ["player"],
      filters: [{ field: "hero", op: "in", value: ["Widowmaker"] }],
      sort: { key: "ratio__ownership_rate", dir: "desc" },
      limit: 20,
    });
    expect(planned?.spec.metrics[0]).toEqual({
      metric: "ownership_rate",
      agg: "ratio",
    });
  });

  it("plans increasing hero trend questions by map type", () => {
    const planned = planQueryFromQuestion({
      teamId: 2,
      question: "Which heroes are trending up on Control?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "hero_trend",
      metrics: [{ metric: "playtime_trend", agg: "avg" }],
      dimensions: ["hero"],
      filters: [
        { field: "map_type", op: "in", value: ["Control"] },
        { field: "trend", op: "in", value: ["increasing"] },
      ],
      sort: { key: "avg__playtime_trend", dir: "desc" },
      limit: 20,
    });
  });

  it("plans map-specific hero pick-rate trend questions", () => {
    const planned = planQueryFromQuestion({
      teamId: 2,
      question: "What is our hero pick rate trend on King's Row?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "hero_trend",
      metrics: [{ metric: "pick_rate_trend", agg: "avg" }],
      dimensions: ["hero"],
      filters: [{ field: "map", op: "in", value: ["King's Row"] }],
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

  it("plans specific-map ability-impact questions", () => {
    const planned = planQueryFromQuestion({
      teamId: 9,
      question: "How does using Suzu affect our fight win rate on King's Row?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "ability_impact",
      metrics: [{ metric: "win_rate", agg: "avg" }],
      dimensions: ["used"],
      filters: [
        { field: "hero", op: "in", value: ["Kiriko"] },
        { field: "ability", op: "in", value: ["Protection Suzu"] },
        { field: "map", op: "in", value: ["King's Row"] },
        { field: "side", op: "eq", value: "us" },
      ],
    });
  });

  it("plans ability-timing questions by phase", () => {
    const planned = planQueryFromQuestion({
      teamId: 9,
      question: "When should we use Suzu?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "ability_timing",
      metrics: [{ metric: "win_rate", agg: "avg" }],
      dimensions: ["phase"],
      filters: [
        { field: "hero", op: "in", value: ["Kiriko"] },
        { field: "ability", op: "in", value: ["Protection Suzu"] },
      ],
      sort: { key: "avg__win_rate", dir: "desc" },
      limit: 20,
    });
  });

  it("plans phase-filtered ability-timing questions by ability", () => {
    const planned = planQueryFromQuestion({
      teamId: 9,
      question: "Which abilities have the best early fight win rate?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "ability_timing",
      metrics: [{ metric: "win_rate", agg: "avg" }],
      dimensions: ["ability"],
      filters: [{ field: "phase", op: "in", value: ["early"] }],
      sort: { key: "avg__win_rate", dir: "desc" },
      limit: 20,
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

  it("plans role-performance per-10 questions onto role metrics", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question: "What is our damage per 10 by role?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "role_performance",
      metrics: [{ metric: "damage_per10", agg: "ratio" }],
      dimensions: ["role"],
      filters: [],
    });
  });

  it("plans role-line winrate questions by map type", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question: "What is our Damage role win rate by map type?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "role_performance",
      metrics: [{ metric: "win_rate", agg: "avg" }],
      dimensions: ["map_type"],
      filters: [{ field: "role", op: "in", value: ["Damage"] }],
    });
  });

  it("plans ranked role death-rate questions", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question: "Which role has the highest deaths per 10?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "role_performance",
      metrics: [{ metric: "deaths_per10", agg: "ratio" }],
      dimensions: ["role"],
      sort: { key: "ratio__deaths_per10", dir: "desc" },
      limit: 20,
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

  it("plans hero-pool diversity questions by role", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question: "How diverse is our hero pool by role?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "hero_diversity",
      metrics: [{ metric: "diversity_score", agg: "avg" }],
      dimensions: ["role"],
      filters: [],
    });
  });

  it("plans thin effective hero-pool questions onto role diversity", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question: "Which role has the lowest effective hero pool?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "hero_diversity",
      metrics: [{ metric: "effective_hero_pool", agg: "sum" }],
      dimensions: ["role"],
      sort: { key: "sum__effective_hero_pool", dir: "asc" },
      limit: 20,
    });
  });

  it("plans unique hero counts per role", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question: "How many unique heroes do we play per role?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "hero_diversity",
      metrics: [{ metric: "unique_heroes", agg: "sum" }],
      dimensions: ["role"],
    });
  });

  it("plans player-intelligence questions onto hero depth metrics", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question: "Who has the deepest hero pool?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "player_intelligence",
      metrics: [{ metric: "hero_pool_size", agg: "avg" }],
      dimensions: ["player"],
      sort: { key: "avg__hero_pool_size", dir: "desc" },
      limit: 20,
    });
  });

  it("plans forced-primary substitution questions", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question: "Who gets forced off their primary hero the most?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "player_intelligence",
      metrics: [{ metric: "substitution_rate", agg: "avg" }],
      dimensions: ["player"],
      sort: { key: "avg__substitution_rate", dir: "desc" },
      limit: 20,
    });
  });

  it("plans player-specific z-score hero questions", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question: "What are PGE's best heroes by z score?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "player_intelligence",
      metrics: [{ metric: "composite_z_score", agg: "max" }],
      dimensions: ["hero"],
      filters: [{ field: "player", op: "in", value: ["PGE"] }],
      sort: { key: "max__composite_z_score", dir: "desc" },
      limit: 20,
    });
  });

  it("plans player-impact consistency questions", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question: "Who is our most consistent player?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "player_impact",
      metrics: [{ metric: "consistency_score", agg: "avg" }],
      dimensions: ["player"],
      sort: { key: "avg__consistency_score", dir: "desc" },
      limit: 20,
    });
  });

  it("plans player-impact volatility questions", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question: "Which players have the most volatile damage per 10?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "player_impact",
      metrics: [{ metric: "all_damage_per10_stddev", agg: "avg" }],
      dimensions: ["player"],
      sort: { key: "avg__all_damage_per10_stddev", dir: "desc" },
      limit: 20,
    });
  });

  it("plans player-impact healing volatility questions", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question: "Which players have the most volatile healing per 10?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "player_impact",
      metrics: [{ metric: "healing_per10_stddev", agg: "avg" }],
      dimensions: ["player"],
      sort: { key: "avg__healing_per10_stddev", dir: "desc" },
      limit: 20,
    });
  });

  it("plans player trend improvement questions", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question: "Which players are improving the most?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "player_trend",
      metrics: [{ metric: "improvement_percentage", agg: "avg" }],
      dimensions: ["player"],
      filters: [{ field: "direction", op: "in", value: ["improving"] }],
      sort: { key: "avg__improvement_percentage", dir: "desc" },
      limit: 20,
    });
  });

  it("plans player trend decline questions for a specific metric", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question: "Whose damage is declining?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "player_trend",
      metrics: [{ metric: "improvement_percentage", agg: "avg" }],
      dimensions: ["player"],
      filters: [
        { field: "direction", op: "in", value: ["declining"] },
        { field: "metric", op: "in", value: ["hero_damage_per10"] },
      ],
      sort: { key: "avg__improvement_percentage", dir: "asc" },
      limit: 20,
    });
  });

  it("plans player-specific trend drilldown questions", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question: "What is PGE improving at?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "player_trend",
      metrics: [{ metric: "improvement_percentage", agg: "avg" }],
      dimensions: ["metric"],
      filters: [
        { field: "player", op: "in", value: ["PGE"] },
        { field: "direction", op: "in", value: ["improving"] },
      ],
      sort: { key: "avg__improvement_percentage", dir: "desc" },
      limit: 20,
    });
  });

  it("plans player outlier questions", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question: "Which players are damage outliers?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "player_outlier",
      metrics: [{ metric: "abs_z_score", agg: "max" }],
      dimensions: ["player"],
      filters: [
        { field: "outlier", op: "eq", value: "yes" },
        { field: "stat", op: "in", value: ["hero_damage_dealt"] },
      ],
      sort: { key: "max__abs_z_score", dir: "desc" },
      limit: 20,
    });
  });

  it("plans player-specific baseline drilldown questions", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question: "Which stats is PGE far below hero baseline on?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "player_outlier",
      metrics: [{ metric: "abs_z_score", agg: "max" }],
      dimensions: ["stat"],
      filters: [
        { field: "player", op: "in", value: ["PGE"] },
        { field: "direction", op: "in", value: ["low"] },
      ],
      sort: { key: "max__abs_z_score", dir: "desc" },
      limit: 20,
    });
  });

  it("plans off-track saved player target questions", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question: "Which player targets are off track?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "player_target",
      metrics: [{ metric: "progress_percent", agg: "avg" }],
      dimensions: ["player", "stat"],
      filters: [{ field: "status", op: "in", value: ["off track"] }],
    });
  });

  it("plans player-specific target progress drilldowns", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question: "What is PGE target progress?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "player_target",
      metrics: [{ metric: "progress_percent", agg: "avg" }],
      dimensions: ["stat"],
      filters: [{ field: "player", op: "in", value: ["PGE"] }],
    });
  });

  it("plans target questions for specific saved goal stats", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question: "Which final blow goals are on track?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "player_target",
      metrics: [{ metric: "progress_percent", agg: "avg" }],
      dimensions: ["player", "stat"],
      filters: [
        { field: "status", op: "in", value: ["on track"] },
        { field: "stat", op: "in", value: ["final_blows"] },
      ],
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

  it("plans specific duel matchup questions with both hero sides", () => {
    const planned = planQueryFromQuestion({
      teamId: 8,
      question: "What is our Tracer duel win rate against Widowmaker?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "duel",
      metrics: [{ metric: "win_rate", agg: "avg" }],
      dimensions: [],
      filters: [
        { field: "our_hero", op: "in", value: ["Tracer"] },
        { field: "enemy_hero", op: "in", value: ["Widowmaker"] },
      ],
    });
  });

  it("plans inverse duel matchup phrasing from the against clause", () => {
    const planned = planQueryFromQuestion({
      teamId: 8,
      question: "How do we do in duels against Widowmaker as Tracer?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "duel",
      metrics: [{ metric: "win_rate", agg: "avg" }],
      dimensions: [],
      filters: [
        { field: "our_hero", op: "in", value: ["Tracer"] },
        { field: "enemy_hero", op: "in", value: ["Widowmaker"] },
      ],
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

  it("plans exact two-hero ult-combo questions", () => {
    const planned = planQueryFromQuestion({
      teamId: 8,
      question: "What is the win rate for Genji and Zarya ult combos?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "ult_combo",
      metrics: [{ metric: "win_rate", agg: "ratio" }],
      dimensions: ["combo"],
      filters: [
        { field: "hero_a", op: "in", value: ["Genji"] },
        { field: "hero_b", op: "in", value: ["Zarya"] },
        { field: "type", op: "eq", value: "combo" },
      ],
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

  it("plans map-specific roster questions onto roster variants", () => {
    const planned = planQueryFromQuestion({
      teamId: 8,
      question: "What is our best roster on King's Row?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "roster_variant",
      metrics: [{ metric: "win_rate", agg: "ratio" }],
      dimensions: ["roster"],
      filters: [{ field: "map", op: "in", value: ["King's Row"] }],
      sort: { key: "ratio__win_rate", dir: "desc" },
      limit: 20,
    });
  });

  it("plans map-specific lineup questions with player filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 8,
      question: "What are our best lineups with PGE on Circuit Royal?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "roster_variant",
      metrics: [{ metric: "win_rate", agg: "ratio" }],
      dimensions: ["roster"],
      filters: [
        { field: "player", op: "in", value: ["PGE"] },
        { field: "map", op: "in", value: ["Circuit Royal"] },
      ],
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

  it("plans recent-form questions onto trend buckets", () => {
    const planned = planQueryFromQuestion({
      teamId: 8,
      question: "What is our win rate over the last 10 maps?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "trend",
      metrics: [
        { metric: "win_rate", agg: "avg" },
        { metric: "maps", agg: "count" },
      ],
      dimensions: [],
      filters: [{ field: "recent_bucket", op: "eq", value: "last 10" }],
    });
  });

  it("plans weekly trend questions onto week groups", () => {
    const planned = planQueryFromQuestion({
      teamId: 8,
      question: "Show our weekly win rate over time",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "trend",
      metrics: [{ metric: "win_rate", agg: "avg" }],
      dimensions: ["week"],
    });
  });

  it("plans current streak questions onto streak summaries", () => {
    const planned = planQueryFromQuestion({
      teamId: 8,
      question: "What is our current win streak?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "streak",
      metrics: [{ metric: "length", agg: "max" }],
      dimensions: ["result"],
      filters: [{ field: "streak", op: "eq", value: "current streak" }],
    });
  });

  it("plans longest loss streak questions onto streak summaries", () => {
    const planned = planQueryFromQuestion({
      teamId: 8,
      question: "What is our longest losing streak?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "streak",
      metrics: [{ metric: "length", agg: "max" }],
      dimensions: ["result"],
      filters: [{ field: "streak", op: "eq", value: "longest loss streak" }],
    });
  });
});
