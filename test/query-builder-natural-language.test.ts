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

  it("plans normalized-by-playtime questions as raw, time, and per-10 metrics", () => {
    const planned = planQueryFromQuestion({
      teamId: 7,
      question:
        "Show PGE's eliminations normalized by minutes played on Tracer",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "player_stat",
      teamId: 7,
      metrics: [
        { metric: "eliminations", agg: "sum" },
        { metric: "time_played", agg: "sum" },
        { metric: "eliminations", agg: "per10" },
      ],
      dimensions: [],
      filters: [
        { field: "hero", op: "in", value: ["Tracer"] },
        { field: "player", op: "in", value: ["PGE"] },
      ],
    });
  });

  it("plans player-stat time-played threshold filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 7,
      question:
        "Show PGE's hero damage per 10 on Tracer with at least 10 minutes played",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "player_stat",
      teamId: 7,
      metrics: [{ metric: "hero_damage", agg: "per10" }],
      dimensions: [],
      filters: [
        { field: "hero", op: "in", value: ["Tracer"] },
        { field: "player", op: "in", value: ["PGE"] },
        { field: "min_time_played", op: "gte", value: 600 },
      ],
    });
  });

  it("plans computed hero-pool time-played threshold filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question:
        "How many final blows does PGE have on Widowmaker in won maps with at least 5 minutes played?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "hero_pool",
      teamId: 5,
      metrics: [{ metric: "final_blows", agg: "sum" }],
      dimensions: [],
      filters: [
        { field: "hero", op: "in", value: ["Widowmaker"] },
        { field: "player", op: "in", value: ["PGE"] },
        { field: "time_played", op: "gte", value: 300 },
        { field: "result", op: "eq", value: "win" },
      ],
    });
  });

  it("plans word-number recent scrim scopes", () => {
    const planned = planQueryFromQuestion({
      teamId: 7,
      question:
        "How many final blows does PGE have on Widowmaker over the last five scrims?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "player_stat",
      teamId: 7,
      metrics: [{ metric: "final_blows", agg: "sum" }],
      dimensions: [],
      filters: [
        { field: "hero", op: "in", value: ["Widowmaker"] },
        { field: "player", op: "in", value: ["PGE"] },
      ],
      timeScope: { kind: "lastN", lastN: 5 },
    });
  });

  it("plans alternate recent scrim phrasing across computed datasets", () => {
    const planned = planQueryFromQuestion({
      teamId: 4,
      question:
        "What is our fight win rate when we have first death over the past 3 scrims?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "teamfight",
      metrics: [{ metric: "win_rate", agg: "avg" }],
      dimensions: [],
      filters: [{ field: "first_death", op: "eq", value: "yes" }],
      timeScope: { kind: "lastN", lastN: 3 },
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

  it("plans leaderboard phrasing onto ranked player stat metrics", () => {
    const planned = planQueryFromQuestion({
      teamId: 7,
      question: "Who leads the team in final blows per 10 on Widowmaker?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "player_stat",
      teamId: 7,
      metrics: [{ metric: "final_blows", agg: "per10" }],
      dimensions: ["player"],
      filters: [{ field: "hero", op: "in", value: ["Widowmaker"] }],
      sort: { key: "per10__final_blows", dir: "desc" },
      limit: 20,
    });
  });

  it("plans ranked-by phrasing onto grouped player stat leaderboards", () => {
    const planned = planQueryFromQuestion({
      teamId: 7,
      question: "Rank players by scoped accuracy on Widowmaker",
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

  it("defaults player-stat leaderboards to player groups", () => {
    const planned = planQueryFromQuestion({
      teamId: 7,
      question: "Show the final blows per 10 leaderboard on Widowmaker",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "player_stat",
      teamId: 7,
      metrics: [{ metric: "final_blows", agg: "per10" }],
      dimensions: ["player"],
      filters: [{ field: "hero", op: "in", value: ["Widowmaker"] }],
      sort: { key: "per10__final_blows", dir: "desc" },
      limit: 20,
    });
  });

  it("lets low-value ranking words beat generic leaderboard wording", () => {
    const planned = planQueryFromQuestion({
      teamId: 7,
      question: "Show the fewest deaths per 10 leaderboard",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "player_stat",
      teamId: 7,
      metrics: [{ metric: "deaths", agg: "per10" }],
      dimensions: ["player"],
      filters: [],
      sort: { key: "per10__deaths", dir: "asc" },
      limit: 20,
    });
  });

  it("plans least phrasing as a low-value ranking without stealing thresholds", () => {
    const planned = planQueryFromQuestion({
      teamId: 7,
      question:
        "Which players have the least deaths per 10 with at least 5 minutes played?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "player_stat",
      teamId: 7,
      metrics: [{ metric: "deaths", agg: "per10" }],
      dimensions: ["player"],
      filters: [{ field: "min_time_played", op: "gte", value: 300 }],
      sort: { key: "per10__deaths", dir: "asc" },
      limit: 20,
    });
  });

  it("plans player-vs-player stat comparisons with grouped player output", () => {
    const planned = planQueryFromQuestion({
      teamId: 7,
      question: "Compare PGE and Seeker final blows per 10 on Widowmaker",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "player_stat",
      teamId: 7,
      metrics: [{ metric: "final_blows", agg: "per10" }],
      dimensions: ["player"],
      filters: [
        { field: "hero", op: "in", value: ["Widowmaker"] },
        { field: "player", op: "in", value: ["PGE", "Seeker"] },
      ],
      sort: null,
      limit: null,
    });
  });

  it("plans hero-vs-hero player stat comparisons with grouped hero output", () => {
    const planned = planQueryFromQuestion({
      teamId: 7,
      question: "Compare PGE final blows per 10 on Tracer and Widowmaker",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "player_stat",
      teamId: 7,
      metrics: [{ metric: "final_blows", agg: "per10" }],
      dimensions: ["hero"],
      filters: [
        { field: "hero", op: "in", value: ["Tracer", "Widowmaker"] },
        { field: "player", op: "in", value: ["PGE"] },
      ],
    });
  });

  it("plans metric-first player comparisons from for-phrasing", () => {
    const planned = planQueryFromQuestion({
      teamId: 7,
      question:
        "Compare scoped accuracy for PGE and Seeker on Widowmaker with at least 5 minutes played",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "player_stat",
      teamId: 7,
      metrics: [{ metric: "scoped_accuracy", agg: "ratio" }],
      dimensions: ["player"],
      filters: [
        { field: "hero", op: "in", value: ["Widowmaker"] },
        { field: "player", op: "in", value: ["PGE", "Seeker"] },
        { field: "min_time_played", op: "gte", value: 300 },
      ],
    });
  });

  it("plans environmental death rate questions by player", () => {
    const planned = planQueryFromQuestion({
      teamId: 7,
      question: "Who has the highest environmental deaths per 10?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "player_stat",
      teamId: 7,
      metrics: [{ metric: "environmental_deaths", agg: "per10" }],
      dimensions: ["player"],
      filters: [],
      sort: { key: "per10__environmental_deaths", dir: "desc" },
      limit: 20,
    });
  });

  it("plans best-multikill questions with max aggregation", () => {
    const planned = planQueryFromQuestion({
      teamId: 7,
      question: "What is PGE's best multikill on Tracer?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "player_stat",
      teamId: 7,
      metrics: [{ metric: "multikill_best", agg: "max" }],
      dimensions: [],
      filters: [
        { field: "hero", op: "in", value: ["Tracer"] },
        { field: "player", op: "in", value: ["PGE"] },
      ],
    });
  });

  it("plans raw critical-kill drilldowns by ability", () => {
    const planned = planQueryFromQuestion({
      teamId: 1,
      question: "How many critical kills by PGE on Widowmaker by ability?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "kill",
      metrics: [{ metric: "critical_kills", agg: "count" }],
      dimensions: ["ability"],
      filters: [
        { field: "attacker_hero", op: "in", value: ["Widowmaker"] },
        { field: "attacker", op: "in", value: ["PGE"] },
      ],
    });
  });

  it("plans raw kill victim drilldowns from who-did phrasing", () => {
    const planned = planQueryFromQuestion({
      teamId: 1,
      question: "Who did PGE kill the most on Widowmaker?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "kill",
      metrics: [{ metric: "kills", agg: "count" }],
      dimensions: ["victim"],
      filters: [
        { field: "attacker_hero", op: "in", value: ["Widowmaker"] },
        { field: "attacker", op: "in", value: ["PGE"] },
      ],
      sort: { key: "count__kills", dir: "desc" },
      limit: 20,
    });
  });

  it("plans raw kill attacker drilldowns for killed-player phrasing", () => {
    const planned = planQueryFromQuestion({
      teamId: 1,
      question: "Who killed PGE the most?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "kill",
      metrics: [{ metric: "kills", agg: "count" }],
      dimensions: ["attacker"],
      filters: [{ field: "victim", op: "in", value: ["PGE"] }],
      sort: { key: "count__kills", dir: "desc" },
      limit: 20,
    });
  });

  it("plans raw hero-swap events with from/to hero filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 1,
      question: "How many hero swaps by PGE from Tracer to Widowmaker?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "hero_swap",
      metrics: [{ metric: "swaps", agg: "count" }],
      dimensions: [],
      filters: [
        { field: "from_hero", op: "in", value: ["Tracer"] },
        { field: "to_hero", op: "in", value: ["Widowmaker"] },
        { field: "player", op: "in", value: ["PGE"] },
      ],
    });
  });

  it("plans ranked raw hero-swap questions by player", () => {
    const planned = planQueryFromQuestion({
      teamId: 1,
      question: "Which players swapped to Widowmaker the most?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "hero_swap",
      metrics: [{ metric: "swaps", agg: "count" }],
      dimensions: ["player"],
      filters: [{ field: "to_hero", op: "in", value: ["Widowmaker"] }],
      sort: { key: "count__swaps", dir: "desc" },
      limit: 20,
    });
  });

  it("plans raw hero-swap timing questions by destination hero", () => {
    const planned = planQueryFromQuestion({
      teamId: 1,
      question: "What is the average time before swap from Tracer?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "hero_swap",
      metrics: [{ metric: "time_before_swap", agg: "avg" }],
      dimensions: ["to_hero"],
      filters: [{ field: "from_hero", op: "in", value: ["Tracer"] }],
    });
  });

  it("plans raw ultimate event counts by player and hero", () => {
    const planned = planQueryFromQuestion({
      teamId: 1,
      question: "How many raw ultimate events did PGE use on Kiriko?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "ultimate",
      metrics: [{ metric: "ultimates", agg: "count" }],
      dimensions: [],
      filters: [
        { field: "hero", op: "in", value: ["Kiriko"] },
        { field: "player", op: "in", value: ["PGE"] },
      ],
    });
  });

  it("plans ranked raw ultimate usage questions by hero", () => {
    const planned = planQueryFromQuestion({
      teamId: 1,
      question: "Which heroes have the most raw ults used?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "ultimate",
      metrics: [{ metric: "ultimates", agg: "count" }],
      dimensions: ["hero"],
      filters: [],
      sort: { key: "count__ultimates", dir: "desc" },
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

  it("plans negated fight-context filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 4,
      question:
        "What is our fight win rate when we do not get first pick and have no first death?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "teamfight",
      metrics: [{ metric: "win_rate", agg: "avg" }],
      dimensions: [],
      filters: [
        { field: "first_death", op: "eq", value: "no" },
        { field: "first_pick", op: "eq", value: "no" },
      ],
    });
  });

  it("plans enemy first-pick fight context as our first death", () => {
    const planned = planQueryFromQuestion({
      teamId: 4,
      question: "What is our fight win rate when enemy gets first pick?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "teamfight",
      metrics: [{ metric: "win_rate", agg: "avg" }],
      dimensions: [],
      filters: [{ field: "first_death", op: "eq", value: "yes" }],
    });
    expect(planned?.spec.filters).not.toContainEqual({
      field: "first_pick",
      op: "eq",
      value: "yes",
    });
  });

  it("plans enemy first-ultimate fight context as our team not first", () => {
    const planned = planQueryFromQuestion({
      teamId: 4,
      question: "What is our fight win rate when they use first ult?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "teamfight",
      metrics: [{ metric: "win_rate", agg: "avg" }],
      dimensions: [],
      filters: [{ field: "first_ult", op: "eq", value: "no" }],
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

  it("plans result-scoped fight metric questions", () => {
    const planned = planQueryFromQuestion({
      teamId: 4,
      question: "How many ultimates did we use in lost fights?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "teamfight",
      metrics: [{ metric: "ults_used", agg: "sum" }],
      dimensions: [],
      filters: [{ field: "result", op: "eq", value: "loss" }],
    });
  });

  it("plans teamfight first-pick rate questions without filtering to first picks", () => {
    const planned = planQueryFromQuestion({
      teamId: 4,
      question: "What is our first pick rate in fights by map type?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "teamfight",
      metrics: [{ metric: "first_pick_rate", agg: "avg" }],
      dimensions: ["map_type"],
      filters: [],
    });
  });

  it("plans teamfight dry-fight reversal rate questions", () => {
    const planned = planQueryFromQuestion({
      teamId: 4,
      question: "What is our dry fight reversal rate?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "teamfight",
      metrics: [{ metric: "dry_fight_reversal_rate", agg: "ratio" }],
      dimensions: [],
      filters: [],
    });
  });

  it("plans grouped fight win-rate threshold filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 4,
      question:
        "Which map types have fight win rate over 60% with at least 2 fights?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "teamfight",
      metrics: [{ metric: "win_rate", agg: "avg" }],
      dimensions: ["map_type"],
      filters: [
        { field: "win_rate", op: "gt", value: 60 },
        { field: "fights", op: "gte", value: 2 },
      ],
    });
  });

  it("plans grouped fight wasted-ultimate threshold filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 4,
      question:
        "Which map types have average wasted ultimates over 0.3 with at least 2 fights?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "teamfight",
      dimensions: ["map_type"],
    });
    expect(planned?.spec.filters).toEqual(
      expect.arrayContaining([
        { field: "avg_wasted_ults", op: "gt", value: 0.3 },
        { field: "fights", op: "gte", value: 2 },
      ])
    );
    expect(planned?.spec.metrics).toEqual(
      expect.arrayContaining([{ metric: "avg_wasted_ults", agg: "avg" }])
    );
    expect(planned?.spec.filters).not.toContainEqual({
      field: "wasted_ults",
      op: "gte",
      value: 1,
    });
  });

  it("plans grouped fight duration threshold filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 4,
      question:
        "Which map types have average fight duration at least 15 seconds with at least 2 fights?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "teamfight",
      metrics: [{ metric: "duration", agg: "avg" }],
      dimensions: ["map_type"],
    });
    expect(planned?.spec.filters).toEqual(
      expect.arrayContaining([
        { field: "duration", op: "gte", value: 15 },
        { field: "fights", op: "gte", value: 2 },
      ])
    );
  });

  it("plans grouped fight rate threshold filters without row context", () => {
    const planned = planQueryFromQuestion({
      teamId: 4,
      question: "Which map types have fight first pick rate at least 50%?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "teamfight",
      metrics: [{ metric: "first_pick_rate", agg: "avg" }],
      dimensions: ["map_type"],
      filters: [{ field: "first_pick_rate", op: "gte", value: 50 }],
    });
    expect(planned?.spec.filters).not.toContainEqual({
      field: "first_pick",
      op: "eq",
      value: "yes",
    });
  });

  it("plans teamfight ultimate-efficiency questions", () => {
    const planned = planQueryFromQuestion({
      teamId: 4,
      question: "What is our ultimate efficiency in fights?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "teamfight",
      metrics: [{ metric: "ultimate_efficiency", agg: "ratio" }],
      dimensions: [],
      filters: [],
    });
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

  it("plans rotation-death pre-fight damage thresholds", () => {
    const planned = planQueryFromQuestion({
      teamId: 4,
      question:
        "Which players have the most rotation deaths with at most 2 pre-fight damage events?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "rotation_death",
      metrics: [{ metric: "rotation_deaths", agg: "sum" }],
      dimensions: ["player"],
      filters: [
        { field: "side", op: "eq", value: "us" },
        { field: "pre_fight_damage", op: "lte", value: 2 },
      ],
      sort: { key: "sum__rotation_deaths", dir: "desc" },
      limit: 20,
    });
  });

  it("plans rotation-death distance thresholds", () => {
    const planned = planQueryFromQuestion({
      teamId: 4,
      question:
        "Which heroes have the most rotation deaths from more than 20 meters away?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "rotation_death",
      metrics: [{ metric: "rotation_deaths", agg: "sum" }],
      dimensions: ["hero"],
      filters: [
        { field: "side", op: "eq", value: "us" },
        { field: "kill_distance", op: "gt", value: 20 },
      ],
      sort: { key: "sum__rotation_deaths", dir: "desc" },
      limit: 20,
    });
  });

  it("plans rotation-death aggregate metric threshold filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 4,
      question:
        "Which players have the highest rotation death rate with rotation death rate at least 75% and at least 1 death?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "rotation_death",
      dimensions: ["player"],
      filters: expect.arrayContaining([
        { field: "side", op: "eq", value: "us" },
        { field: "rotation_death_rate", op: "gte", value: 75 },
        { field: "deaths", op: "gte", value: 1 },
      ]),
      sort: { key: "avg__rotation_death_rate", dir: "desc" },
      limit: 20,
    });
    expect(planned?.spec.metrics).toEqual(
      expect.arrayContaining([{ metric: "rotation_death_rate", agg: "avg" }])
    );
  });

  it("plans aggregate pre-fight damage thresholds for rotation deaths", () => {
    const planned = planQueryFromQuestion({
      teamId: 4,
      question:
        "Which players have average pre-fight damage under 10 on rotation deaths?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "rotation_death",
      dimensions: ["player"],
      filters: [
        { field: "side", op: "eq", value: "us" },
        { field: "avg_pre_fight_damage", op: "lt", value: 10 },
      ],
    });
    expect(planned?.spec.metrics).toEqual(
      expect.arrayContaining([{ metric: "pre_fight_damage", agg: "avg" }])
    );
    expect(planned?.spec.filters).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "pre_fight_damage" }),
      ])
    );
  });

  it("plans aggregate kill-distance thresholds for rotation deaths", () => {
    const planned = planQueryFromQuestion({
      teamId: 4,
      question:
        "Which maps have average kill distance over 20 meters for rotation deaths?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "rotation_death",
      metrics: [{ metric: "kill_distance", agg: "avg" }],
      dimensions: ["map"],
      filters: [
        { field: "side", op: "eq", value: "us" },
        { field: "avg_kill_distance", op: "gt", value: 20 },
      ],
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

  it("plans alternate ult-economy advantage bucket phrasing", () => {
    const planned = planQueryFromQuestion({
      teamId: 4,
      question: "What is our fight win rate with an ult advantage?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "ult_economy",
      metrics: [{ metric: "win_rate", agg: "avg" }],
      filters: [{ field: "advantage_bucket", op: "in", value: ["1 ahead"] }],
    });
  });

  it("plans negative ult-economy advantage bucket phrasing", () => {
    const planned = planQueryFromQuestion({
      teamId: 4,
      question: "What is our fight win rate when we are down by two ults?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "ult_economy",
      metrics: [{ metric: "win_rate", agg: "avg" }],
      filters: [{ field: "advantage_bucket", op: "in", value: ["2+ behind"] }],
    });
  });

  it("plans ult-economy aggregate metric thresholds", () => {
    const planned = planQueryFromQuestion({
      teamId: 4,
      question:
        "Which ult advantage buckets have fight win rate over 60% with at least 10 fights?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "ult_economy",
      metrics: [
        { metric: "win_rate", agg: "avg" },
        { metric: "fights", agg: "count" },
      ],
      dimensions: ["advantage_bucket"],
      filters: [
        { field: "win_rate", op: "gt", value: 60 },
        { field: "fights", op: "gte", value: 10 },
      ],
    });
  });

  it("plans average ult-advantage threshold drilldowns", () => {
    const planned = planQueryFromQuestion({
      teamId: 4,
      question:
        "Which map types have average ult advantage above 1 with at least 8 fights?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "ult_economy",
      metrics: [
        { metric: "avg_advantage", agg: "avg" },
        { metric: "fights", agg: "count" },
      ],
      dimensions: ["map_type"],
      filters: [
        { field: "avg_advantage", op: "gt", value: 1 },
        { field: "fights", op: "gte", value: 8 },
      ],
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

  it("plans calculated-stat percentage threshold filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 4,
      question: "Which players have first pick rate over 25%?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "calculated_stat",
      metrics: [{ metric: "first_pick_pct", agg: "avg" }],
      dimensions: ["player"],
      filters: [{ field: "first_pick_pct", op: "gt", value: 25 }],
    });
  });

  it("plans multiple calculated-stat threshold filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 4,
      question:
        "Which players have first pick rate over 25% and first death rate below 10%?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "calculated_stat",
      dimensions: ["player"],
      filters: [
        { field: "first_pick_pct", op: "gt", value: 25 },
        { field: "first_death_pct", op: "lt", value: 10 },
      ],
    });
  });

  it("plans calculated-stat duration threshold filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 4,
      question: "Which players average ult charge time under 90 seconds?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "calculated_stat",
      metrics: [{ metric: "ult_charge_time", agg: "avg" }],
      dimensions: ["player"],
      filters: [{ field: "ult_charge_time", op: "lt", value: 90 }],
    });
  });

  it("plans calculated-stat ratio-like threshold filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 4,
      question: "Which players have at least 2 kills per ultimate?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "calculated_stat",
      metrics: [{ metric: "kills_per_ult", agg: "avg" }],
      dimensions: ["player"],
      filters: [{ field: "kills_per_ult", op: "gte", value: 2 }],
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

  it("plans fight-relative opening-kill timing filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 4,
      question:
        "Which players get first pick within the first 10 seconds of fights?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "opening_kill",
      metrics: [{ metric: "first_picks", agg: "sum" }],
      dimensions: ["attacker"],
      filters: [
        { field: "attacker_side", op: "eq", value: "us" },
        { field: "fight_time", op: "lte", value: 10 },
      ],
    });
  });

  it("plans map-relative opening-kill timing filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 4,
      question: "Which players die first after 30 seconds into the map?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "opening_kill",
      metrics: [{ metric: "first_deaths", agg: "sum" }],
      dimensions: ["player"],
      filters: [
        { field: "side", op: "eq", value: "us" },
        { field: "kill_time", op: "gt", value: 30 },
      ],
    });
  });

  it("plans aggregate fight-relative opening-pick timing filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 4,
      question:
        "Which players get first picks with average time into fight under 5 seconds?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "opening_kill",
      dimensions: ["attacker"],
      filters: [
        { field: "attacker_side", op: "eq", value: "us" },
        { field: "avg_fight_time", op: "lt", value: 5 },
      ],
    });
    expect(planned?.spec.metrics).toEqual(
      expect.arrayContaining([
        { metric: "first_picks", agg: "sum" },
        { metric: "fight_time", agg: "avg" },
      ])
    );
    expect(planned?.spec.filters).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "fight_time" })])
    );
  });

  it("plans aggregate map-relative opening-kill timing filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 4,
      question: "Which maps have average opening kill time under 90 seconds?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "opening_kill",
      metrics: [{ metric: "kill_time", agg: "avg" }],
      dimensions: ["map"],
      filters: [{ field: "avg_kill_time", op: "lt", value: 90 }],
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

  it("plans opening-kill aggregate metric threshold filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 4,
      question:
        "Which players have the most first deaths with at least 2 first deaths and win rate at most 50%?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "opening_kill",
      dimensions: ["player"],
      sort: { key: "sum__first_deaths", dir: "desc" },
      limit: 20,
    });
    expect(planned?.spec.metrics).toEqual(
      expect.arrayContaining([
        { metric: "first_deaths", agg: "sum" },
        { metric: "win_rate", agg: "avg" },
      ])
    );
    expect(planned?.spec.filters).toEqual(
      expect.arrayContaining([
        { field: "side", op: "eq", value: "us" },
        { field: "first_deaths", op: "gte", value: 2 },
        { field: "win_rate", op: "lte", value: 50 },
      ])
    );
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

  it("plans multi-map comparisons with grouped map output", () => {
    const planned = planQueryFromQuestion({
      teamId: 2,
      question: "Compare our map win rate on King's Row and Circuit Royal",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "map_result",
      metrics: [{ metric: "win_rate", agg: "avg" }],
      dimensions: ["map"],
      filters: [
        { field: "map", op: "in", value: ["King's Row", "Circuit Royal"] },
      ],
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

  it("plans grouped map win-rate threshold filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 2,
      question: "Which map types have map win rate at least 55% over 3 maps?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "map_result",
      metrics: [
        { metric: "win_rate", agg: "avg" },
        { metric: "maps", agg: "count" },
      ],
      dimensions: ["map_type"],
      filters: [
        { field: "win_rate", op: "gte", value: 55 },
        { field: "maps", op: "gt", value: 3 },
      ],
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

  it("plans grouped team-performance metric thresholds", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question:
        "Compare our team with more than 40 final blows per 10 vs the opponent",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "team_performance",
      metrics: [{ metric: "final_blows_per10", agg: "ratio" }],
      dimensions: ["side"],
      filters: [{ field: "final_blows_per10", op: "gt", value: 40 }],
    });
  });

  it("plans extended team-performance aggregate thresholds", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question:
        "Compare our team damage taken per 10 vs the opponent with damage taken per 10 under 6500 and at least 2 map MVPs",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "team_performance",
      metrics: [
        { metric: "damage_taken_per10", agg: "ratio" },
        { metric: "map_mvp_count", agg: "sum" },
      ],
      dimensions: ["side"],
      filters: [
        { field: "damage_taken_per10", op: "lt", value: 6500 },
        { field: "map_mvp_count", op: "gte", value: 2 },
      ],
    });
  });

  it("plans team-performance ult-use timing thresholds", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question:
        "Compare our team average time to use ult vs the opponent with time to use ult under 20 seconds",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "team_performance",
      metrics: [{ metric: "average_time_to_use_ult", agg: "avg" }],
      dimensions: ["side"],
      filters: [{ field: "average_time_to_use_ult", op: "lt", value: 20 }],
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

  it("plans team offensive-assist rate comparisons", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question: "Compare our team offensive assists per 10 vs the opponent",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "team_performance",
      metrics: [{ metric: "offensive_assists_per10", agg: "ratio" }],
      dimensions: ["side"],
      filters: [],
    });
  });

  it("plans our-team Ajax rate questions", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question: "What is our team Ajax per 10?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "team_performance",
      metrics: [{ metric: "ajax_per10", agg: "ratio" }],
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

  it("plans confidence-scoped map intelligence questions", () => {
    const planned = planQueryFromQuestion({
      teamId: 2,
      question: "Which high confidence maps are improving?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "map_intelligence",
      metrics: [{ metric: "trend_delta", agg: "avg" }],
      dimensions: ["map"],
      filters: [
        { field: "trend", op: "in", value: ["improving"] },
        { field: "confidence", op: "in", value: ["high"] },
      ],
      sort: { key: "avg__trend_delta", dir: "desc" },
      limit: 20,
    });
  });

  it("plans insufficient-sample map intelligence questions", () => {
    const planned = planQueryFromQuestion({
      teamId: 2,
      question:
        "Which maps have the best weighted win rate with not enough data?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "map_intelligence",
      metrics: [{ metric: "weighted_win_rate", agg: "ratio" }],
      dimensions: ["map"],
      filters: [{ field: "confidence", op: "in", value: ["insufficient"] }],
      sort: { key: "ratio__weighted_win_rate", dir: "desc" },
      limit: 20,
    });
  });

  it("plans map-intelligence aggregate metric threshold filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 2,
      question:
        "Which map types have time-decayed weighted win rate at least 70% with at least 3 maps?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "map_intelligence",
      dimensions: ["map_type"],
      filters: [
        { field: "weighted_win_rate", op: "gte", value: 70 },
        { field: "maps", op: "gte", value: 3 },
      ],
    });
    expect(planned?.spec.metrics).toEqual(
      expect.arrayContaining([{ metric: "weighted_win_rate", agg: "ratio" }])
    );
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

  it("plans multi-map playtime comparisons with grouped map output", () => {
    const planned = planQueryFromQuestion({
      teamId: 2,
      question: "How much time have we played on King's Row and Lijiang Tower?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "map_result",
      metrics: [{ metric: "playtime", agg: "sum" }],
      dimensions: ["map"],
      filters: [
        { field: "map", op: "in", value: ["King's Row", "Lijiang Tower"] },
      ],
    });
  });

  it("plans map-result playtime threshold filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 2,
      question: "Which map types have more than 15 minutes of playtime?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "map_result",
      metrics: [{ metric: "playtime", agg: "sum" }],
      dimensions: ["map_type"],
      filters: [{ field: "playtime", op: "gt", value: 900 }],
    });
  });

  it("plans average map-duration threshold filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 2,
      question: "Which opponents have average map duration under 10 minutes?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "map_result",
      metrics: [{ metric: "playtime", agg: "avg" }],
      dimensions: ["opponent"],
      filters: [{ field: "avg_playtime", op: "lt", value: 600 }],
    });
  });

  it("plans registry-derived aggregate threshold aliases", () => {
    const planned = planQueryFromQuestion({
      teamId: 8,
      question: "Which ult combos have over 4 total uses?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "ult_combo",
      dimensions: ["combo"],
      filters: expect.arrayContaining([{ field: "uses", op: "gt", value: 4 }]),
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

  it("plans player-map metric threshold filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 2,
      question:
        "Which players have player map win rate under 45% with at least 4 games?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "player_map_performance",
      metrics: [
        { metric: "win_rate", agg: "ratio" },
        { metric: "games", agg: "sum" },
      ],
      dimensions: ["player"],
      filters: [
        { field: "win_rate", op: "lt", value: 45 },
        { field: "games", op: "gte", value: 4 },
      ],
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

  it("plans hero ownership threshold filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 2,
      question: "Which players have at least 40% ownership of Widowmaker?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "hero_pickrate",
      metrics: [{ metric: "ownership_rate", agg: "ratio" }],
      dimensions: ["player"],
      filters: [
        { field: "hero", op: "in", value: ["Widowmaker"] },
        { field: "ownership_rate", op: "gte", value: 40 },
      ],
    });
  });

  it("plans player pick-rate threshold filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 2,
      question: "Which heroes does PGE play under 10% pick rate?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "hero_pickrate",
      metrics: [{ metric: "pick_rate", agg: "ratio" }],
      dimensions: ["hero"],
      filters: [
        { field: "player", op: "in", value: ["PGE"] },
        { field: "pick_rate", op: "lt", value: 10 },
      ],
    });
  });

  it("plans hero-pickrate games threshold filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 2,
      question: "Which heroes has PGE played on at least 5 maps?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "hero_pickrate",
      metrics: [{ metric: "games", agg: "sum" }],
      dimensions: ["hero"],
      filters: [
        { field: "player", op: "in", value: ["PGE"] },
        { field: "games", op: "gte", value: 5 },
      ],
    });
  });

  it("plans hero-pickrate aggregate threshold filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 2,
      question:
        "Which players have at least 40% ownership of Widowmaker with at least 1 game?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "hero_pickrate",
      metrics: [{ metric: "ownership_rate", agg: "ratio" }],
      dimensions: ["player"],
    });
    expect(planned?.spec.filters).toEqual(
      expect.arrayContaining([
        { field: "hero", op: "in", value: ["Widowmaker"] },
        { field: "ownership_rate", op: "gte", value: 40 },
        { field: "games", op: "gte", value: 1 },
      ])
    );
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

  it("plans hero trend aggregate threshold filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 2,
      question:
        "Which damage heroes have hero trend pick rate trend at least 10 and at least 2 maps played?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "hero_trend",
      dimensions: ["hero"],
    });
    expect(planned?.spec.metrics).toEqual(
      expect.arrayContaining([{ metric: "pick_rate_trend", agg: "avg" }])
    );
    expect(planned?.spec.filters).toEqual(
      expect.arrayContaining([
        { field: "role", op: "in", value: ["Damage"] },
        { field: "pick_rate_trend", op: "gte", value: 10 },
        { field: "maps_played", op: "gte", value: 2 },
      ])
    );
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

  it("plans ability loss questions after using abilities", () => {
    const planned = planQueryFromQuestion({
      teamId: 9,
      question: "Which abilities do we lose fights after using the most?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "ability_impact",
      dimensions: ["ability"],
      filters: [
        { field: "side", op: "eq", value: "us" },
        { field: "used", op: "eq", value: "yes" },
      ],
      sort: { key: "sum__losses", dir: "desc" },
      limit: 20,
    });
    expect(planned?.spec.metrics[0]).toEqual({
      metric: "losses",
      agg: "sum",
    });
  });

  it("plans result-scoped ability-impact questions", () => {
    const planned = planQueryFromQuestion({
      teamId: 9,
      question: "What is our win rate when using Suzu in lost fights?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "ability_impact",
      filters: [
        { field: "hero", op: "in", value: ["Kiriko"] },
        { field: "ability", op: "in", value: ["Protection Suzu"] },
        { field: "result", op: "eq", value: "loss" },
        { field: "side", op: "eq", value: "us" },
        { field: "used", op: "eq", value: "yes" },
      ],
    });
    expect(planned?.spec.metrics[0]).toEqual({
      metric: "win_rate",
      agg: "avg",
    });
  });

  it("plans enemy ability-use winrate filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 9,
      question: "What is our win rate when enemy uses Suzu?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "ability_impact",
      metrics: [{ metric: "win_rate", agg: "avg" }],
      filters: [
        { field: "hero", op: "in", value: ["Kiriko"] },
        { field: "ability", op: "in", value: ["Protection Suzu"] },
        { field: "side", op: "eq", value: "enemy" },
        { field: "used", op: "eq", value: "yes" },
      ],
    });
  });

  it("plans negated enemy ability-use winrate filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 9,
      question: "What is our win rate when enemy does not use Suzu?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "ability_impact",
      metrics: [{ metric: "win_rate", agg: "avg" }],
      filters: [
        { field: "hero", op: "in", value: ["Kiriko"] },
        { field: "ability", op: "in", value: ["Protection Suzu"] },
        { field: "side", op: "eq", value: "enemy" },
        { field: "used", op: "eq", value: "no" },
      ],
    });
  });

  it("plans ability-impact aggregate metric threshold filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 9,
      question:
        "How does using Suzu affect our fight win rate with at least 2 fights and win rate at least 50%?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "ability_impact",
      metrics: [
        { metric: "win_rate", agg: "avg" },
        { metric: "fights", agg: "count" },
      ],
      dimensions: ["used"],
    });
    expect(planned?.spec.filters).toEqual(
      expect.arrayContaining([
        { field: "hero", op: "in", value: ["Kiriko"] },
        { field: "ability", op: "in", value: ["Protection Suzu"] },
        { field: "side", op: "eq", value: "us" },
        { field: "fights", op: "gte", value: 2 },
        { field: "win_rate", op: "gte", value: 50 },
      ])
    );
  });

  it("plans enemy ability loss questions after use", () => {
    const planned = planQueryFromQuestion({
      teamId: 9,
      question:
        "Which enemy abilities do we lose fights after they use the most?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "ability_impact",
      dimensions: ["ability"],
      filters: [
        { field: "side", op: "eq", value: "enemy" },
        { field: "used", op: "eq", value: "yes" },
      ],
      sort: { key: "sum__losses", dir: "desc" },
      limit: 20,
    });
    expect(planned?.spec.metrics[0]).toEqual({
      metric: "losses",
      agg: "sum",
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

  it("plans ability-timing aggregate metric threshold filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 9,
      question:
        "Which phases should we use Suzu when win rate delta over 30 with at least 2 fights?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "ability_timing",
      metrics: [
        { metric: "fights", agg: "count" },
        { metric: "win_rate_delta", agg: "avg" },
      ],
      dimensions: ["phase"],
    });
    expect(planned?.spec.filters).toEqual(
      expect.arrayContaining([
        { field: "hero", op: "in", value: ["Kiriko"] },
        { field: "ability", op: "in", value: ["Protection Suzu"] },
        { field: "win_rate_delta", op: "gt", value: 30 },
        { field: "fights", op: "gte", value: 2 },
      ])
    );
  });

  it("plans ability-timing loss questions by phase", () => {
    const planned = planQueryFromQuestion({
      teamId: 9,
      question: "Which phases do we lose fights after using Suzu the most?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "ability_timing",
      dimensions: ["phase"],
      filters: [
        { field: "hero", op: "in", value: ["Kiriko"] },
        { field: "ability", op: "in", value: ["Protection Suzu"] },
      ],
      sort: { key: "sum__losses", dir: "desc" },
      limit: 20,
    });
    expect(planned?.spec.metrics[0]).toEqual({
      metric: "losses",
      agg: "sum",
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

  it("plans result-scoped swap-impact questions", () => {
    const planned = planQueryFromQuestion({
      teamId: 3,
      question: "What is our win rate when we swap in lost maps?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "swap_impact",
      dimensions: ["swap_count_bucket"],
      filters: [
        { field: "result", op: "eq", value: "loss" },
        { field: "had_swap", op: "eq", value: "yes" },
      ],
    });
    expect(planned?.spec.metrics[0]).toEqual({
      metric: "win_rate",
      agg: "avg",
    });
  });

  it("plans exact swap-count filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 3,
      question: "What is our win rate when we make exactly 2 swaps?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "swap_impact",
      metrics: [{ metric: "win_rate", agg: "avg" }],
      dimensions: [],
      filters: [
        { field: "had_swap", op: "eq", value: "yes" },
        { field: "swap_count", op: "eq", value: 2 },
      ],
    });
  });

  it("plans threshold swap-count filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 3,
      question: "What is our win rate on maps with at least three swaps?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "swap_impact",
      metrics: [{ metric: "win_rate", agg: "avg" }],
      dimensions: [],
      filters: [
        { field: "had_swap", op: "eq", value: "yes" },
        { field: "swap_count", op: "gte", value: 3 },
      ],
    });
  });

  it("plans first-swap timing filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 3,
      question: "What is our win rate when we make a late first swap?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "swap_impact",
      metrics: [{ metric: "win_rate", agg: "avg" }],
      dimensions: ["swap_count_bucket"],
      filters: [
        { field: "had_swap", op: "eq", value: "yes" },
        { field: "first_swap_timing", op: "eq", value: "late" },
      ],
    });
  });

  it("plans first-swap timing grouping", () => {
    const planned = planQueryFromQuestion({
      teamId: 3,
      question: "What is our win rate by swap timing?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "swap_impact",
      metrics: [{ metric: "win_rate", agg: "avg" }],
      dimensions: ["first_swap_timing"],
      filters: [],
    });
  });

  it("plans swap-impact aggregate metric threshold filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 3,
      question:
        "What is our win rate by swap timing with map win rate at least 50% and at least 2 maps?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "swap_impact",
      metrics: [
        { metric: "win_rate", agg: "avg" },
        { metric: "maps", agg: "count" },
      ],
      dimensions: ["first_swap_timing"],
      filters: [
        { field: "win_rate", op: "gte", value: 50 },
        { field: "maps", op: "gte", value: 2 },
      ],
    });
  });

  it("plans average-swap aggregate threshold filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 3,
      question: "Which map types have average swaps per map over 2?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "swap_impact",
      metrics: [{ metric: "avg_swaps", agg: "avg" }],
      dimensions: ["map_type"],
      filters: [{ field: "avg_swaps", op: "gt", value: 2 }],
    });
  });

  it("plans swap-count loss questions onto swap buckets", () => {
    const planned = planQueryFromQuestion({
      teamId: 3,
      question: "Which swap counts do we lose maps with the most?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "swap_impact",
      dimensions: ["swap_count_bucket"],
      sort: { key: "sum__losses", dir: "desc" },
      limit: 20,
    });
    expect(planned?.spec.metrics[0]).toEqual({
      metric: "losses",
      agg: "sum",
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

  it("plans hero loss questions onto hero-pool loss counts", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question: "Which heroes do we have the most losses on?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "hero_pool",
      dimensions: ["hero"],
      sort: { key: "sum__losses", dir: "desc" },
      limit: 20,
    });
    expect(planned?.spec.metrics[0]).toEqual({
      metric: "losses",
      agg: "sum",
    });
  });

  it("plans result-scoped hero stat questions onto hero pool", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question: "How many final blows does PGE have on Widowmaker in won maps?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "hero_pool",
      metrics: [{ metric: "final_blows", agg: "sum" }],
      dimensions: [],
      filters: [
        { field: "hero", op: "in", value: ["Widowmaker"] },
        { field: "player", op: "in", value: ["PGE"] },
        { field: "result", op: "eq", value: "win" },
      ],
    });
  });

  it("plans result-scoped hero stats versus playtime with per-10 context", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question:
        "How many final blows does PGE have on Widowmaker versus the time played in won maps?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "hero_pool",
      metrics: [
        { metric: "final_blows", agg: "sum" },
        { metric: "time_played", agg: "sum" },
        { metric: "final_blows", agg: "per10" },
      ],
      dimensions: [],
      filters: [
        { field: "hero", op: "in", value: ["Widowmaker"] },
        { field: "player", op: "in", value: ["PGE"] },
        { field: "result", op: "eq", value: "win" },
      ],
    });
  });

  it("plans multi-hero hero-pool comparisons with grouped hero output", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question: "Compare hero win rates for Tracer and Widowmaker",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "hero_pool",
      metrics: [{ metric: "win_rate", agg: "avg" }],
      dimensions: ["hero"],
      filters: [{ field: "hero", op: "in", value: ["Tracer", "Widowmaker"] }],
    });
  });

  it("plans hero-pool aggregate metric threshold filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question:
        "Which heroes have hero win rate over 55% with at least 3 appearances?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "hero_pool",
      metrics: [
        { metric: "win_rate", agg: "avg" },
        { metric: "appearances", agg: "count" },
      ],
      dimensions: ["hero"],
      filters: [
        { field: "win_rate", op: "gt", value: 55 },
        { field: "appearances", op: "gte", value: 3 },
      ],
    });
  });

  it("plans hero-pool per-10 aggregate and total-playtime thresholds", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question:
        "Which Damage heroes have final blows per 10 over 8 with at least 30 minutes total time played?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "hero_pool",
      dimensions: ["hero"],
      filters: expect.arrayContaining([
        { field: "role", op: "in", value: ["Damage"] },
        { field: "final_blows_per10", op: "gt", value: 8 },
        { field: "total_time_played", op: "gte", value: 1800 },
      ]),
    });
    expect(planned?.spec.metrics).toEqual(
      expect.arrayContaining([
        { metric: "final_blows", agg: "per10" },
        { metric: "time_played", agg: "sum" },
      ])
    );
  });

  it("plans hero-pool ratio and result-count thresholds", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question:
        "Which heroes have final blows per death over 2 and at least 3 losses?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "hero_pool",
      dimensions: ["hero"],
      filters: expect.arrayContaining([
        { field: "kd", op: "gt", value: 2 },
        { field: "losses", op: "gte", value: 3 },
      ]),
    });
    expect(planned?.spec.metrics).toEqual(
      expect.arrayContaining([
        { metric: "kd", agg: "ratio" },
        { metric: "losses", agg: "sum" },
      ])
    );
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

  it("plans ranked role assist-rate questions", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question: "Which role has the highest assists per 10?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "role_performance",
      metrics: [{ metric: "assists_per10", agg: "ratio" }],
      dimensions: ["role"],
      sort: { key: "ratio__assists_per10", dir: "desc" },
      limit: 20,
    });
  });

  it("plans role-performance aggregate metric threshold filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question: "Which roles have damage per 10 over 8000 and at least 2 maps?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "role_performance",
      metrics: [
        { metric: "damage_per10", agg: "ratio" },
        { metric: "maps", agg: "count" },
      ],
      dimensions: ["role"],
    });
    expect(planned?.spec.filters).toEqual(
      expect.arrayContaining([
        { field: "damage_per10", op: "gt", value: 8000 },
        { field: "maps", op: "gte", value: 2 },
      ])
    );
  });

  it("plans extended role-performance aggregate thresholds", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question:
        "Which roles have damage taken per 10 under 6500, at least 3 ultimates earned per 10, and at least 30 minutes played?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "role_performance",
      dimensions: ["role"],
    });
    expect(planned?.spec.metrics).toEqual(
      expect.arrayContaining([
        { metric: "damage_taken_per10", agg: "ratio" },
        { metric: "ults_earned_per10", agg: "ratio" },
      ])
    );
    expect(planned?.spec.filters).toEqual(
      expect.arrayContaining([
        { field: "damage_taken_per10", op: "lt", value: 6500 },
        { field: "ults_earned_per10", op: "gte", value: 3 },
        { field: "time_played", op: "gte", value: 1800 },
      ])
    );
  });

  it("plans role ultimate usage rate questions", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question: "What are ultimates used per 10 by role?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "role_performance",
      metrics: [{ metric: "ults_used_per10", agg: "ratio" }],
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

  it("plans hero-pool diversity aggregate threshold filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question:
        "Which roles have diversity score at least 45% and at least 5 maps played?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "hero_diversity",
      dimensions: ["role"],
      filters: [
        { field: "diversity_score", op: "gte", value: 45 },
        { field: "maps_played", op: "gte", value: 5 },
      ],
    });
    expect(planned?.spec.metrics).toEqual(
      expect.arrayContaining([{ metric: "diversity_score", agg: "avg" }])
    );
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

  it("plans primary-hero ownership questions", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question: "Who has Tracer as their primary hero?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "player_intelligence",
      metrics: [{ metric: "hero_pool_size", agg: "avg" }],
      dimensions: ["player"],
      filters: [{ field: "primary_hero", op: "in", value: ["Tracer"] }],
    });
  });

  it("plans most-played hero ownership questions", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question: "Which players have Widowmaker as their most played hero?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "player_intelligence",
      metrics: [{ metric: "hero_pool_size", agg: "avg" }],
      dimensions: ["player"],
      filters: [{ field: "most_played_hero", op: "in", value: ["Widowmaker"] }],
    });
  });

  it("plans player-specific non-primary hero drilldowns", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question: "What are PGE's non-primary heroes by z score?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "player_intelligence",
      metrics: [{ metric: "composite_z_score", agg: "max" }],
      dimensions: ["hero"],
      filters: [
        { field: "player", op: "in", value: ["PGE"] },
        { field: "is_primary", op: "eq", value: "no" },
      ],
      sort: { key: "max__composite_z_score", dir: "desc" },
      limit: 20,
    });
  });

  it("plans hero-pool-size threshold filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question: "Who has hero pool size at least 4?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "player_intelligence",
      metrics: [{ metric: "hero_pool_size", agg: "avg" }],
      dimensions: ["player"],
      filters: [{ field: "hero_pool_size", op: "gte", value: 4 }],
    });
  });

  it("plans substitution-rate threshold filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question: "Which players have substitution rate above 25%?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "player_intelligence",
      metrics: [{ metric: "substitution_rate", agg: "avg" }],
      dimensions: ["player"],
      filters: [{ field: "substitution_rate", op: "gt", value: 25 }],
    });
  });

  it("plans forced-map threshold filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question: "Who has more than 2 forced maps?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "player_intelligence",
      metrics: [{ metric: "maps_forced", agg: "max" }],
      dimensions: ["player"],
      filters: [{ field: "maps_forced", op: "gt", value: 2 }],
    });
  });

  it("plans primary-time-share threshold filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question: "Which players have primary time share at least 70%?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "player_intelligence",
      metrics: [{ metric: "primary_time_share", agg: "ratio" }],
      dimensions: ["player"],
      filters: [{ field: "primary_time_share", op: "gte", value: 70 }],
    });
  });

  it("plans player-intelligence per-10 aggregate thresholds", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question:
        "Which players have player intelligence damage per 10 above 8000 and at least 8 maps played?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "player_intelligence",
      dimensions: ["player"],
      filters: [
        { field: "maps_played", op: "gte", value: 8 },
        { field: "damage_per10", op: "gt", value: 8000 },
      ],
    });
    expect(planned?.spec.metrics).toEqual(
      expect.arrayContaining([{ metric: "damage_per10", agg: "avg" }])
    );
  });

  it("plans player-intelligence duration threshold filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question:
        "Which players have hero depth with at least 10 minutes played?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "player_intelligence",
      metrics: [{ metric: "hero_pool_size", agg: "avg" }],
      dimensions: ["player"],
      filters: [{ field: "time_played", op: "gte", value: 600 }],
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

  it("plans player-impact first-pick rate questions", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question: "Who has the most first picks per 10?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "player_impact",
      metrics: [{ metric: "first_picks_per10", agg: "ratio" }],
      dimensions: ["player"],
      sort: { key: "ratio__first_picks_per10", dir: "desc" },
      limit: 20,
    });
  });

  it("plans player-impact Ajax rate questions", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question: "Which players have the most Ajax per 10?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "player_impact",
      metrics: [{ metric: "ajax_per10", agg: "ratio" }],
      dimensions: ["player"],
      sort: { key: "ratio__ajax_per10", dir: "desc" },
      limit: 20,
    });
  });

  it("plans player-impact ultimate timing questions", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question: "Which players have the fastest player impact ult charge time?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "player_impact",
      metrics: [{ metric: "average_ult_charge_time", agg: "avg" }],
      dimensions: ["player"],
      sort: { key: "avg__average_ult_charge_time", dir: "asc" },
      limit: 20,
    });
  });

  it("plans player-impact duel winrate thresholds", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question:
        "Which players have player impact duel win rate over 55% with drought time under 40 seconds?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "player_impact",
      dimensions: ["player"],
    });
    expect(planned?.spec.metrics).toEqual(
      expect.arrayContaining([
        { metric: "duel_winrate_percentage", agg: "avg" },
        { metric: "average_drought_time", agg: "avg" },
      ])
    );
    expect(planned?.spec.filters).toEqual(
      expect.arrayContaining([
        { field: "duel_winrate_percentage", op: "gt", value: 55 },
        { field: "average_drought_time", op: "lt", value: 40 },
      ])
    );
  });

  it("plans player-impact aggregate metric threshold filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question:
        "Which Damage players have hero damage per 10 over 8000 with at least 5 maps and consistency score at least 80?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "player_impact",
      dimensions: ["player"],
    });
    expect(planned?.spec.metrics).toEqual(
      expect.arrayContaining([
        { metric: "hero_damage_per10", agg: "ratio" },
        { metric: "maps", agg: "sum" },
        { metric: "consistency_score", agg: "avg" },
      ])
    );
    expect(planned?.spec.filters).toEqual(
      expect.arrayContaining([
        { field: "role", op: "in", value: ["Damage"] },
        { field: "hero_damage_per10", op: "gt", value: 8000 },
        { field: "maps", op: "gte", value: 5 },
        { field: "consistency_score", op: "gte", value: 80 },
      ])
    );
  });

  it("plans player-impact duration threshold filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question:
        "Which players have player impact kills per ult over 2 with at least 30 minutes played?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "player_impact",
      dimensions: ["player"],
    });
    expect(planned?.spec.metrics).toEqual(
      expect.arrayContaining([{ metric: "kills_per_ultimate", agg: "avg" }])
    );
    expect(planned?.spec.filters).toEqual(
      expect.arrayContaining([
        { field: "kills_per_ultimate", op: "gt", value: 2 },
        { field: "hero_time_played", op: "gte", value: 1800 },
      ])
    );
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

  it("plans player-trend aggregate metric threshold filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question:
        "Which players are improving the most with improvement percentage at least 30% and sample size at least 8?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "player_trend",
      dimensions: ["player"],
      filters: [
        { field: "direction", op: "in", value: ["improving"] },
        { field: "improvement_percentage", op: "gte", value: 30 },
        { field: "maps", op: "gte", value: 8 },
      ],
      sort: { key: "avg__improvement_percentage", dir: "desc" },
      limit: 20,
    });
    expect(planned?.spec.metrics).toEqual(
      expect.arrayContaining([{ metric: "improvement_percentage", agg: "avg" }])
    );
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

  it("plans percentile-threshold player outlier questions", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question: "Which hero damage outliers are above 90th percentile?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "player_outlier",
      metrics: [{ metric: "percentile", agg: "avg" }],
      dimensions: ["player"],
      filters: [
        { field: "outlier", op: "eq", value: "yes" },
        { field: "stat", op: "in", value: ["hero_damage_dealt"] },
        { field: "percentile", op: "gt", value: 90 },
      ],
    });
  });

  it("plans z-score threshold baseline drilldowns", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question: "Which hero-baseline stats does PGE have a z score over 2 on?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "player_outlier",
      metrics: [{ metric: "z_score", agg: "avg" }],
      dimensions: ["stat"],
      filters: [
        { field: "player", op: "in", value: ["PGE"] },
        { field: "z_score", op: "gt", value: 2 },
      ],
    });
  });

  it("plans player-outlier baseline sample threshold filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question:
        "Which damage outliers have percentile at least 90 and at least 70 sample players?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "player_outlier",
      dimensions: ["player"],
      filters: [
        { field: "outlier", op: "eq", value: "yes" },
        { field: "stat", op: "in", value: ["hero_damage_dealt"] },
        { field: "percentile", op: "gte", value: 90 },
        { field: "sample_players", op: "gte", value: 70 },
      ],
    });
    expect(planned?.spec.metrics).toEqual(
      expect.arrayContaining([{ metric: "percentile", agg: "avg" }])
    );
  });

  it("plans player-outlier per-10 and duration thresholds", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question:
        "Which damage outliers have per 10 value over 9000 with at least 20 minutes hero time played?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "player_outlier",
      dimensions: ["player"],
      filters: [
        { field: "outlier", op: "eq", value: "yes" },
        { field: "stat", op: "in", value: ["hero_damage_dealt"] },
        { field: "per10_value", op: "gt", value: 9000 },
        { field: "hero_time_played", op: "gte", value: 1200 },
      ],
    });
    expect(planned?.spec.metrics).toEqual(
      expect.arrayContaining([{ metric: "per10_value", agg: "avg" }])
    );
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

  it("plans progress-threshold saved player target questions", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question: "Which final blow goals are under 50% progress?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "player_target",
      metrics: [{ metric: "progress_percent", agg: "avg" }],
      dimensions: ["player", "stat"],
      filters: [
        { field: "stat", op: "in", value: ["final_blows"] },
        { field: "progress_percent", op: "lt", value: 50 },
      ],
    });
  });

  it("plans target gap and sample-size threshold questions", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question:
        "Which player goals have gap to target over 3 with at least 4 sample scrims?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "player_target",
      metrics: [{ metric: "gap_to_target", agg: "avg" }],
      dimensions: ["player", "stat"],
      filters: [
        { field: "gap_to_target", op: "gt", value: 3 },
        { field: "sample_scrims", op: "gte", value: 4 },
      ],
    });
  });

  it("plans saved target value and window thresholds", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question:
        "Which player goals have target value at least 8 with scrim window at least 10?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "player_target",
      dimensions: ["player", "stat"],
      filters: [
        { field: "target_value", op: "gte", value: 8 },
        { field: "scrim_window", op: "gte", value: 10 },
      ],
    });
    expect(planned?.spec.metrics).toEqual(
      expect.arrayContaining([{ metric: "target_value", agg: "avg" }])
    );
  });

  it("plans saved target current and baseline thresholds", () => {
    const planned = planQueryFromQuestion({
      teamId: 5,
      question:
        "Which final blow goals have current value over 7 and baseline value at least 5?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "player_target",
      dimensions: ["player", "stat"],
      filters: [
        { field: "stat", op: "in", value: ["final_blows"] },
        { field: "current_value", op: "gt", value: 7 },
        { field: "baseline_value", op: "gte", value: 5 },
      ],
    });
    expect(planned?.spec.metrics).toEqual(
      expect.arrayContaining([{ metric: "current_value", agg: "avg" }])
    );
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

  it("plans enemy hero map loss questions as ranked matchup groups", () => {
    const planned = planQueryFromQuestion({
      teamId: 8,
      question: "Which enemy heroes do we lose maps against the most?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "enemy_hero",
      dimensions: ["enemy_hero"],
      sort: { key: "sum__losses", dir: "desc" },
      limit: 20,
    });
    expect(planned?.spec.metrics[0]).toEqual({
      metric: "losses",
      agg: "sum",
    });
  });

  it("plans result-scoped enemy hero matchup questions", () => {
    const planned = planQueryFromQuestion({
      teamId: 8,
      question:
        "Which enemy heroes do we have the most maps against in lost maps?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "enemy_hero",
      metrics: [{ metric: "maps", agg: "count" }],
      dimensions: ["enemy_hero"],
      filters: [{ field: "result", op: "eq", value: "loss" }],
      sort: { key: "count__maps", dir: "desc" },
      limit: 20,
    });
  });

  it("plans enemy-hero aggregate metric threshold filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 8,
      question:
        "Which enemy heroes have win rate at most 50% with at least 2 maps?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "enemy_hero",
      metrics: [
        { metric: "win_rate", agg: "avg" },
        { metric: "maps", agg: "count" },
      ],
      dimensions: ["enemy_hero"],
      filters: [
        { field: "win_rate", op: "lte", value: 50 },
        { field: "maps", op: "gte", value: 2 },
      ],
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

  it("plans duel aggregate metric threshold filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 8,
      question:
        "Which enemy heroes have duel win rate under 50% with at least 2 duels?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "duel",
      metrics: [
        { metric: "win_rate", agg: "avg" },
        { metric: "duels", agg: "count" },
      ],
      dimensions: ["enemy_hero"],
      filters: [
        { field: "win_rate", op: "lt", value: 50 },
        { field: "duels", op: "gte", value: 2 },
      ],
    });
  });

  it("plans duel loss questions as ranked enemy hero groups", () => {
    const planned = planQueryFromQuestion({
      teamId: 8,
      question: "Which enemy heroes do we lose duels to the most?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "duel",
      metrics: [{ metric: "losses", agg: "sum" }],
      dimensions: ["enemy_hero"],
      sort: { key: "sum__losses", dir: "desc" },
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

  it("plans ban-impact aggregate metric threshold filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 8,
      question:
        "Which strong bans have win rate delta over 20 with at least 4 maps banned?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "ban_impact",
      metrics: [
        { metric: "win_rate_delta", agg: "avg" },
        { metric: "maps_banned", agg: "sum" },
      ],
      dimensions: ["hero"],
    });
    expect(planned?.spec.filters).toEqual(
      expect.arrayContaining([
        { field: "side", op: "eq", value: "banned by us" },
        { field: "tag", op: "eq", value: "strong ban" },
        { field: "win_rate_delta", op: "gt", value: 20 },
        { field: "maps_banned", op: "gte", value: 4 },
      ])
    );
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

  it("plans ult-combo aggregate metric threshold filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 8,
      question:
        "Which ult combos have win rate at least 50% with at least 2 uses?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "ult_combo",
      metrics: [
        { metric: "win_rate", agg: "ratio" },
        { metric: "uses", agg: "sum" },
      ],
      dimensions: ["combo"],
    });
    expect(planned?.spec.filters).toEqual(
      expect.arrayContaining([
        { field: "type", op: "eq", value: "combo" },
        { field: "win_rate", op: "gte", value: 50 },
        { field: "uses", op: "gte", value: 2 },
      ])
    );
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
      filters: [{ field: "player", op: "eq", value: "PGE" }],
      sort: { key: "ratio__win_rate", dir: "desc" },
      limit: 20,
    });
  });

  it("plans multi-player lineup membership filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 8,
      question: "What are our best lineups with PGE and Rupal?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "role_trio",
      metrics: [{ metric: "win_rate", agg: "ratio" }],
      dimensions: ["trio"],
      filters: [
        { field: "player", op: "eq", value: "PGE" },
        { field: "player", op: "eq", value: "Rupal" },
      ],
      sort: { key: "ratio__win_rate", dir: "desc" },
      limit: 20,
    });
  });

  it("plans excluded-player lineup filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 8,
      question: "What are our best lineups with PGE but without Rupal?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "role_trio",
      metrics: [{ metric: "win_rate", agg: "ratio" }],
      dimensions: ["trio"],
      filters: [
        { field: "player", op: "eq", value: "PGE" },
        { field: "player", op: "neq", value: "Rupal" },
      ],
      sort: { key: "ratio__win_rate", dir: "desc" },
      limit: 20,
    });
  });

  it("plans role-trio aggregate metric threshold filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 8,
      question:
        "What are our best role trios with win rate at least 75% and at least 5 games?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "role_trio",
      metrics: [
        { metric: "win_rate", agg: "ratio" },
        { metric: "games", agg: "sum" },
      ],
      dimensions: ["trio"],
      filters: [
        { field: "win_rate", op: "gte", value: 75 },
        { field: "games", op: "gte", value: 5 },
      ],
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

  it("plans best-roster-for-each-map questions onto roster variants", () => {
    const planned = planQueryFromQuestion({
      teamId: 8,
      question: "What are our best rosters for each map?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "roster_variant",
      metrics: [{ metric: "win_rate", agg: "ratio" }],
      dimensions: ["map", "roster"],
      filters: [{ field: "is_best_for_map", op: "eq", value: "yes" }],
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
        { field: "map", op: "in", value: ["Circuit Royal"] },
        { field: "player", op: "eq", value: "PGE" },
      ],
      sort: { key: "ratio__win_rate", dir: "desc" },
      limit: 20,
    });
  });

  it("plans roster aggregate metric threshold filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 8,
      question:
        "What are our best lineups on Circuit Royal with win rate at least 75% and at least 3 games?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "roster_variant",
      metrics: [
        { metric: "win_rate", agg: "ratio" },
        { metric: "games", agg: "sum" },
      ],
      dimensions: ["roster"],
      filters: [
        { field: "map", op: "in", value: ["Circuit Royal"] },
        { field: "win_rate", op: "gte", value: 75 },
        { field: "games", op: "gte", value: 3 },
      ],
      sort: { key: "ratio__win_rate", dir: "desc" },
      limit: 20,
    });
  });

  it("plans map-specific roster questions with multiple player filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 8,
      question:
        "What are our best lineups with PGE and Vega on Circuit Royal without Rupal?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "roster_variant",
      metrics: [{ metric: "win_rate", agg: "ratio" }],
      dimensions: ["roster"],
      filters: [
        { field: "map", op: "in", value: ["Circuit Royal"] },
        { field: "player", op: "eq", value: "PGE" },
        { field: "player", op: "eq", value: "Vega" },
        { field: "player", op: "neq", value: "Rupal" },
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

  it("plans ultimate-impact aggregate metric threshold filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 8,
      question:
        "Which heroes have ult win rate at least 60% with at least 3 fights when we use ult?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "ult_impact",
      metrics: [
        { metric: "win_rate", agg: "ratio" },
        { metric: "fights", agg: "sum" },
      ],
      dimensions: ["hero"],
    });
    expect(planned?.spec.filters).toEqual(
      expect.arrayContaining([
        { field: "side", op: "in", value: ["us", "both"] },
        { field: "win_rate", op: "gte", value: 60 },
        { field: "fights", op: "gte", value: 3 },
      ])
    );
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
      filters: [{ field: "scenario", op: "eq", value: "mirror, enemy first" }],
    });
  });

  it("plans uncontested enemy ultimate questions onto exact scenario filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 8,
      question:
        "Which heroes have the best win rate when enemy uses an uncontested ult?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "ult_impact",
      metrics: [{ metric: "win_rate", agg: "ratio" }],
      dimensions: ["hero"],
      filters: [
        { field: "scenario", op: "eq", value: "enemy used uncontested" },
      ],
      sort: { key: "ratio__win_rate", dir: "desc" },
      limit: 20,
    });
  });

  it("plans mirrored ultimate first-use questions onto exact scenario filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 8,
      question: "What is our win rate in mirror ult fights when we ult first?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "ult_impact",
      dimensions: ["hero"],
      filters: [{ field: "scenario", op: "eq", value: "mirror, we first" }],
    });
    expect(planned?.spec.metrics).toEqual(
      expect.arrayContaining([{ metric: "win_rate", agg: "ratio" }])
    );
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

  it("plans per-game ult-usage questions onto per-map metrics", () => {
    const planned = planQueryFromQuestion({
      teamId: 8,
      question: "Who has the most ultimates per game?",
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

  it("plans fight-opening hero per-map questions onto ult usage summaries", () => {
    const planned = planQueryFromQuestion({
      teamId: 8,
      question: "Which heroes have the most fight openings per map?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "ult_usage",
      metrics: [{ metric: "fight_openings_per_map", agg: "ratio" }],
      dimensions: ["hero"],
      filters: [{ field: "row_type", op: "eq", value: "fight opening hero" }],
      sort: { key: "ratio__fight_openings_per_map", dir: "desc" },
      limit: 20,
    });
  });

  it("plans ult-usage aggregate metric threshold filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 8,
      question:
        "Which players have the most ults per map with at least 2 ults per map and at least 4 maps?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "ult_usage",
      dimensions: ["player"],
      sort: { key: "avg__ults_per_map", dir: "desc" },
      limit: 20,
    });
    expect(planned?.spec.metrics).toEqual(
      expect.arrayContaining([{ metric: "ults_per_map", agg: "avg" }])
    );
    expect(planned?.spec.filters).toEqual(
      expect.arrayContaining([
        { field: "row_type", op: "eq", value: "player" },
        { field: "maps_played", op: "gte", value: 4 },
        { field: "ults_per_map", op: "gte", value: 2 },
      ])
    );
  });

  it("plans fight-opening ultimate per-map threshold filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 8,
      question: "Which heroes open fights with ult per map at least 0.5 times?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "ult_usage",
      metrics: [{ metric: "fight_openings_per_map", agg: "ratio" }],
      dimensions: ["hero"],
      filters: [
        { field: "row_type", op: "eq", value: "fight opening hero" },
        { field: "fight_openings_per_map", op: "gte", value: 0.5 },
      ],
    });
  });

  it("plans fight-opening ultimate per-game threshold filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 8,
      question:
        "Which heroes open fights with ult per game at least 0.5 times?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "ult_usage",
      metrics: [{ metric: "fight_openings_per_map", agg: "ratio" }],
      dimensions: ["hero"],
      filters: [
        { field: "row_type", op: "eq", value: "fight opening hero" },
        { field: "fight_openings_per_map", op: "gte", value: 0.5 },
      ],
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

  it("plans quick-wins last-game phrasing onto trend buckets", () => {
    const planned = planQueryFromQuestion({
      teamId: 8,
      question: "What is our win rate over the last 10 games?",
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

  it("plans best day-of-week questions onto trend groups", () => {
    const planned = planQueryFromQuestion({
      teamId: 8,
      question: "What is our best day of week?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "trend",
      metrics: [
        { metric: "win_rate", agg: "avg" },
        { metric: "maps", agg: "count" },
      ],
      dimensions: ["day_of_week"],
      sort: { key: "avg__win_rate", dir: "desc" },
      limit: 20,
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

  it("plans trend aggregate metric threshold filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 8,
      question:
        "Show weekly win rate over time with win rate at least 60% and at least 2 maps",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "trend",
      metrics: [
        { metric: "win_rate", agg: "avg" },
        { metric: "maps", agg: "count" },
      ],
      dimensions: ["week"],
      filters: [
        { field: "win_rate", op: "gte", value: 60 },
        { field: "maps", op: "gte", value: 2 },
      ],
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

  it("plans streak aggregate metric threshold filters", () => {
    const planned = planQueryFromQuestion({
      teamId: 8,
      question: "Which streaks are at least 3 games long?",
    });

    expect(planned?.spec).toMatchObject({
      dataset: "streak",
      metrics: [{ metric: "length", agg: "max" }],
      dimensions: ["streak"],
      filters: [{ field: "length", op: "gte", value: 3 }],
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
