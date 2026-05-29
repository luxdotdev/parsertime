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
});
