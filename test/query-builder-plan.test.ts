import {
  buildPlan,
  renderDisplaySql,
  toExecutable,
} from "@/lib/query-builder/plan";
import { querySpecSchema, type QuerySpec } from "@/lib/query-builder/types";
import { describe, expect, it } from "vitest";

function parse(spec: unknown): QuerySpec {
  return querySpecSchema.parse(spec);
}

describe("query-builder compiler", () => {
  it("scopes player_stat to the team's scrims inside the final-rows CTE", () => {
    const spec = parse({
      dataset: "player_stat",
      teamId: 5,
      metrics: [
        { metric: "eliminations", agg: "avg" },
        { metric: "deaths", agg: "per10" },
      ],
      dimensions: ["player", "hero"],
      filters: [
        { field: "hero", op: "in", value: ["Tracer", "Genji"] },
        { field: "min_time_played", op: "gte", value: 60 },
      ],
      sort: { key: "avg__eliminations", dir: "desc" },
      limit: 20,
    });
    const plan = buildPlan(spec);
    const { sql, params } = toExecutable(plan, [10, 11, 12]);

    expect(sql).toContain("WITH final_rows AS");
    expect(sql).toContain(
      'DISTINCT ON (ps."MapDataId", ps."player_name", ps."player_hero")'
    );
    // Team scope is the first thing bound, inside the CTE.
    expect(sql).toContain('WHERE ps."scrimId" IN ($1, $2, $3)');
    expect(sql).toContain(
      '(AVG(fr."eliminations"))::float8 AS "avg__eliminations"'
    );
    expect(sql).toContain('* 600)::float8 AS "per10__deaths"'); // rate metric
    expect(sql).toContain("GROUP BY 1, 2");
    expect(sql).toContain('ORDER BY "avg__eliminations" DESC');
    expect(sql).toContain("LIMIT 20");

    // Values are bound, never interpolated.
    expect(sql).not.toContain("Tracer");
    expect(sql).not.toContain("Genji");
    expect(params).toEqual([10, 11, 12, "Tracer", "Genji", 60]);
  });

  it("scopes kill queries in the outer WHERE and counts rows", () => {
    const spec = parse({
      dataset: "kill",
      teamId: 1,
      metrics: [{ metric: "kills", agg: "count" }],
      dimensions: ["attacker_hero"],
    });
    const plan = buildPlan(spec);
    const { sql, params } = toExecutable(plan, [7, 8]);

    expect(plan.scopeInCte).toBe(false);
    expect(sql).toContain('FROM "Kill" k');
    expect(sql).toContain('WHERE k."scrimId" IN ($1, $2)');
    expect(sql).toContain("(COUNT(*))::float8");
    expect(params).toEqual([7, 8]);
  });

  it("reads calculated stats with a FILTER clause per stat type", () => {
    const spec = parse({
      dataset: "calculated_stat",
      teamId: 3,
      metrics: [{ metric: "mvp_score", agg: "avg" }],
      dimensions: ["player"],
    });
    const { sql } = toExecutable(buildPlan(spec), [1]);
    expect(sql).toContain(
      `(AVG(cs."value") FILTER (WHERE cs."stat" = 'MVP_SCORE'::"CalculatedStatType"))::float8`
    );
  });

  it("joins MatchStart for map-type dimensions and casts the enum to text", () => {
    const spec = parse({
      dataset: "player_stat",
      teamId: 2,
      metrics: [{ metric: "eliminations", agg: "sum" }],
      dimensions: ["map_type"],
    });
    const { sql } = toExecutable(buildPlan(spec), [1]);
    expect(sql).toContain(
      'FROM "MatchStart") ms ON ms."MapDataId" = fr."MapDataId"'
    );
    expect(sql).toContain('ms."map_type"::text AS "map_type"');
    expect(buildPlan(spec).tables).toContain("MatchStart");
  });

  it("rejects identifiers that are not in the registry", () => {
    const bad: QuerySpec = {
      dataset: "player_stat",
      teamId: 1,
      metrics: [{ metric: "drop_table", agg: "sum" }],
      dimensions: [],
      filters: [],
      timeScope: { kind: "all" },
      sort: null,
      limit: null,
    };
    expect(() => buildPlan(bad)).toThrow(/Unknown metric/);
  });

  it("never produces an empty IN list (guards against unscoped scans)", () => {
    const spec = parse({
      dataset: "player_stat",
      teamId: 9,
      metrics: [{ metric: "maps", agg: "count" }],
    });
    const { sql, params } = toExecutable(buildPlan(spec), []);
    expect(sql).toContain('ps."scrimId" IN ($1)');
    expect(params).toEqual([-1]);
  });

  it("counts hero swaps and joins MatchStart for the map-type grouping", () => {
    const spec = parse({
      dataset: "hero_swap",
      teamId: 4,
      metrics: [{ metric: "swaps", agg: "count" }],
      dimensions: ["to_hero", "map_type"],
    });
    const plan = buildPlan(spec);
    const { sql, params } = toExecutable(plan, [10, 11]);
    expect(sql).toContain('FROM "HeroSwap" hs');
    expect(sql).toContain('WHERE hs."scrimId" IN ($1, $2)');
    expect(sql).toContain("(COUNT(*))::float8");
    expect(sql).toContain('hs."player_hero" AS "to_hero"');
    expect(sql).toContain(
      'FROM "MatchStart") ms ON ms."MapDataId" = hs."MapDataId"'
    );
    expect(sql).toContain('ms."map_type"::text AS "map_type"');
    expect(params).toEqual([10, 11]);
  });

  it("treats map_type as a base column for the maps dataset (no join)", () => {
    const spec = parse({
      dataset: "map",
      teamId: 4,
      metrics: [{ metric: "maps", agg: "count" }],
      dimensions: ["map_type"],
    });
    const plan = buildPlan(spec);
    const { sql } = toExecutable(plan, [1]);
    expect(sql).toContain('FROM "MatchStart" m');
    expect(sql).toContain('m."map_type"::text AS "map_type"');
    expect(sql).not.toContain("LEFT JOIN"); // base table already is MatchStart
    expect(plan.tables).toEqual(["MatchStart"]);
  });

  it("counts ultimates from UltimateEnd", () => {
    const spec = parse({
      dataset: "ultimate",
      teamId: 4,
      metrics: [{ metric: "ultimates", agg: "count" }],
      dimensions: ["hero"],
    });
    const { sql } = toExecutable(buildPlan(spec), [1]);
    expect(sql).toContain('FROM "UltimateEnd" u');
    expect(sql).toContain('u."player_hero" AS "hero"');
  });

  it("renders a readable display query with the team scope annotated", () => {
    const spec = parse({
      dataset: "player_stat",
      teamId: 5,
      metrics: [{ metric: "eliminations", agg: "avg" }],
      dimensions: ["player"],
      filters: [{ field: "hero", op: "in", value: ["Tracer"] }],
    });
    const display = renderDisplaySql(buildPlan(spec), {
      teamName: "Cloud9",
      scrimCount: 3,
    });
    expect(display).toContain("/* Cloud9: 3 scrims */");
    // The display preview inlines values for readability.
    expect(display).toContain("'Tracer'");
  });
});
