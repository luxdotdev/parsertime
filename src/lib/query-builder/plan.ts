import {
  AGG_SQL_LABELS,
  getDataset,
  getDimension,
  getFilter,
  getMetric,
  type FilterDef,
  type MetricDef,
} from "@/lib/query-builder/registry";
import {
  metricKey,
  type Aggregation,
  type QueryFilter,
  type QuerySpec,
  type ResultColumn,
} from "@/lib/query-builder/types";

/**
 * Pure, client-safe query planning. `buildPlan` validates every id against the
 * registry (throwing on anything unknown) and produces a structured plan that
 * two renderers consume:
 *   - `renderDisplaySql` for the read-only technical underlay
 *   - `toExecutable` for the parameterized statement the server runs
 *
 * Identifiers (tables, columns) only ever come from the registry, never from
 * client free-text; user values always flow through bound parameters. That is
 * what keeps the generated SQL injection-safe.
 */

const BASE_ALIAS: Record<QuerySpec["dataset"], string> = {
  player_stat: "fr",
  kill: "k",
  calculated_stat: "cs",
  hero_swap: "hs",
  ultimate: "u",
  map: "m",
  // computed datasets never use the SQL planner, but the map must be total
  teamfight: "tf",
  opening_kill: "ok",
  rotation_death: "rd",
  map_result: "mr",
  team_performance: "tp",
  map_intelligence: "mi",
  player_map_performance: "pmp",
  player_impact: "pim",
  player_trend: "ptr",
  player_outlier: "po",
  role_performance: "rp",
  ult_economy: "ue",
  duel: "d",
  ability_impact: "ai",
  ability_timing: "at",
  swap_impact: "si",
  hero_pool: "hp",
  hero_pickrate: "hpr",
  player_intelligence: "pi",
  enemy_hero: "eh",
  ban_impact: "bi",
  ult_combo: "uc",
  role_trio: "rt",
  roster_variant: "rv",
  ult_impact: "ui",
  ult_usage: "uu",
  trend: "tr",
  streak: "st",
};

const ENUM_TEXT_COLUMNS = new Set(["map_type", "role"]);

type WhereClause = { sql: string; params: (string | number)[] };

export type PlanSelection = {
  key: string;
  label: string;
  sqlExpr: string;
  kind: "dimension" | "metric";
  precision?: number;
  unit?: string;
};

export type QueryPlan = {
  dataset: QuerySpec["dataset"];
  baseTable: string;
  baseAlias: string;
  needsFinalRows: boolean;
  /** scrimId reference for the team scope, e.g. `ps."scrimId"` or `k."scrimId"` */
  scopeColumn: string;
  /** true when the team scope belongs inside the final-rows CTE */
  scopeInCte: boolean;
  joins: { matchStart: boolean; scrim: boolean };
  selections: PlanSelection[];
  dimensionCount: number;
  whereClauses: WhereClause[];
  orderBy: { key: string; dir: "asc" | "desc" } | null;
  limit: number;
  tables: string[];
  columns: ResultColumn[];
};

function quoteIdent(col: string): string {
  return `"${col.replace(/"/g, '""')}"`;
}

function columnRef(
  source: "base" | "match_start" | "scrim",
  column: string,
  baseAlias: string
): string {
  const alias =
    source === "match_start" ? "ms" : source === "scrim" ? "s" : baseAlias;
  const ref = `${alias}.${quoteIdent(column)}`;
  return ENUM_TEXT_COLUMNS.has(column) ? `${ref}::text` : ref;
}

function metricExpr(
  metric: MetricDef,
  agg: Aggregation,
  baseAlias: string
): string {
  if (metric.statType) {
    // CalculatedStat: aggregate the value column, scoped to this stat type.
    const fn = agg === "count" ? "COUNT" : agg.toUpperCase();
    return `(${fn}(${baseAlias}."value") FILTER (WHERE ${baseAlias}."stat" = '${metric.statType}'::"CalculatedStatType"))::float8`;
  }
  if (metric.column === null || agg === "count") {
    const filter = metric.countFilter
      ? ` FILTER (WHERE ${metric.countFilter})`
      : "";
    return `(COUNT(*)${filter})::float8`;
  }
  const ref = `${baseAlias}.${quoteIdent(metric.column)}`;
  if (agg === "ratio") {
    if (!metric.denominatorColumn) return `(0)::float8`;
    const denom = `${baseAlias}.${quoteIdent(metric.denominatorColumn)}`;
    const scale = metric.denominatorScale ?? 1;
    return `((SUM(${ref})::numeric / NULLIF(SUM(${denom}), 0)) * ${scale})::float8`;
  }
  if (agg === "per10") {
    const denominator = metric.denominatorColumn ?? "hero_time_played";
    const denom = `${baseAlias}.${quoteIdent(denominator)}`;
    const scale = metric.denominatorScale ?? 600;
    return `((SUM(${ref})::numeric / NULLIF(SUM(${denom}), 0)) * ${scale})::float8`;
  }
  return `(${agg.toUpperCase()}(${ref}))::float8`;
}

function buildWhereClause(
  filter: FilterDef,
  spec: QueryFilter,
  baseAlias: string
): WhereClause {
  const ref = columnRef(filter.source, filter.column, baseAlias);
  if (spec.op === "in" || spec.op === "nin") {
    const values = Array.isArray(spec.value) ? spec.value : [spec.value];
    if (values.length === 0) return { sql: "TRUE", params: [] };
    const placeholders = values.map(() => "?").join(", ");
    const keyword = spec.op === "nin" ? "NOT IN" : "IN";
    return { sql: `${ref} ${keyword} (${placeholders})`, params: values };
  }
  const single = Array.isArray(spec.value) ? spec.value[0] : spec.value;
  const opSql: Record<string, string> = {
    eq: "=",
    neq: "<>",
    gt: ">",
    gte: ">=",
    lt: "<",
    lte: "<=",
  };
  return { sql: `${ref} ${opSql[spec.op]} ?`, params: [single] };
}

export function buildPlan(spec: QuerySpec): QueryPlan {
  const dataset = getDataset(spec.dataset);
  const baseAlias = BASE_ALIAS[spec.dataset];
  const needsFinalRows = spec.dataset === "player_stat";

  const joins = { matchStart: false, scrim: false };
  const tables = new Set<string>([dataset.table]);
  const selections: PlanSelection[] = [];
  const columns: ResultColumn[] = [];

  // Dimensions first so GROUP BY can use ordinals and they lead the table.
  for (const dimId of spec.dimensions) {
    const dim = getDimension(spec.dataset, dimId);
    if (!dim) throw new Error(`Unknown dimension: ${dimId}`);
    if (dim.source === "match_start") joins.matchStart = true;
    if (dim.source === "scrim") joins.scrim = true;
    tables.add(dim.table);
    selections.push({
      key: dim.id,
      label: dim.label,
      sqlExpr: columnRef(dim.source, dim.column, baseAlias),
      kind: "dimension",
    });
    columns.push({ key: dim.id, label: dim.label, kind: "dimension" });
  }

  for (const ref of spec.metrics) {
    const metric = getMetric(spec.dataset, ref.metric);
    if (!metric) throw new Error(`Unknown metric: ${ref.metric}`);
    if (!metric.allowedAggs.includes(ref.agg)) {
      throw new Error(`Aggregation ${ref.agg} not allowed for ${ref.metric}`);
    }
    tables.add(metric.table);
    const key = metricKey(ref);
    selections.push({
      key,
      label: metric.label,
      sqlExpr: metricExpr(metric, ref.agg, baseAlias),
      kind: "metric",
      precision: metric.precision,
      unit: metric.unit,
    });
    columns.push({
      key,
      label: metric.label,
      kind: "metric",
      precision: metric.precision,
      unit: metric.unit,
    });
  }

  const whereClauses: WhereClause[] = [];
  for (const f of spec.filters) {
    const filter = getFilter(spec.dataset, f.field);
    if (!filter) throw new Error(`Unknown filter: ${f.field}`);
    if (!filter.operators.includes(f.op)) {
      throw new Error(`Operator ${f.op} not allowed for ${f.field}`);
    }
    if (filter.source === "match_start") joins.matchStart = true;
    tables.add(filter.table);
    whereClauses.push(buildWhereClause(filter, f, baseAlias));
  }

  if (joins.scrim) tables.add("Scrim");
  if (joins.matchStart) tables.add("MatchStart");

  // A scrim-name dimension needs the Scrim join even though scope is by id.
  const validKeys = new Set(selections.map((s) => s.key));
  const orderBy = spec.sort && validKeys.has(spec.sort.key) ? spec.sort : null;

  const scopeColumn = `${needsFinalRows ? "ps" : baseAlias}."scrimId"`;

  return {
    dataset: spec.dataset,
    baseTable: dataset.table,
    baseAlias,
    needsFinalRows,
    scopeColumn,
    scopeInCte: needsFinalRows,
    joins,
    selections,
    dimensionCount: spec.dimensions.length,
    whereClauses,
    orderBy,
    limit: spec.limit ?? 1000,
    tables: Array.from(tables),
    columns,
  };
}

function joinSql(plan: QueryPlan): string {
  const parts: string[] = [];
  if (plan.joins.matchStart) {
    parts.push(
      `LEFT JOIN (SELECT DISTINCT ON ("MapDataId") "MapDataId", "map_name", "map_type" FROM "MatchStart") ms ON ms."MapDataId" = ${plan.baseAlias}."MapDataId"`
    );
  }
  if (plan.joins.scrim) {
    parts.push(`LEFT JOIN "Scrim" s ON s."id" = ${plan.baseAlias}."scrimId"`);
  }
  return parts.length ? `\n${parts.join("\n")}` : "";
}

function selectSql(plan: QueryPlan): string {
  return plan.selections
    .map((s) => `  ${s.sqlExpr} AS ${quoteIdent(s.key)}`)
    .join(",\n");
}

function groupBySql(plan: QueryPlan): string {
  if (plan.dimensionCount === 0) return "";
  const ordinals = Array.from(
    { length: plan.dimensionCount },
    (_, i) => i + 1
  ).join(", ");
  return `\nGROUP BY ${ordinals}`;
}

function orderLimitSql(plan: QueryPlan): string {
  let out = "";
  if (plan.orderBy) {
    out += `\nORDER BY ${quoteIdent(plan.orderBy.key)} ${plan.orderBy.dir.toUpperCase()} NULLS LAST`;
  }
  out += `\nLIMIT ${plan.limit}`;
  return out;
}

function fromSql(
  plan: QueryPlan,
  scopePlaceholder: string
): { cte: string; from: string } {
  if (plan.needsFinalRows) {
    const cte = `WITH final_rows AS (
  SELECT DISTINCT ON (ps."MapDataId", ps."player_name", ps."player_hero") ps.*
  FROM "PlayerStat" ps
  WHERE ${plan.scopeColumn} IN (${scopePlaceholder})
  ORDER BY ps."MapDataId", ps."player_name", ps."player_hero", ps."round_number" DESC, ps."id" DESC
)
`;
    return { cte, from: `FROM final_rows ${plan.baseAlias}` };
  }
  return {
    cte: "",
    from: `FROM ${quoteIdent(plan.baseTable)} ${plan.baseAlias}`,
  };
}

/**
 * Render the plan as a parameterized statement for `$queryRawUnsafe`.
 * Param order is: team scrim ids, then filter params in clause order.
 */
export function toExecutable(
  plan: QueryPlan,
  scrimIds: number[]
): { sql: string; params: (string | number)[] } {
  const params: (string | number)[] = [];
  let n = 0;
  function next() {
    return `$${++n}`;
  }

  const safeIds = scrimIds.length > 0 ? scrimIds : [-1];
  // Allocate the scope placeholders exactly once, where the scope actually
  // lives: inside the final-rows CTE for player_stat, or the outer WHERE
  // otherwise. Allocating in both places would bind more params than the
  // statement has placeholders, which Postgres rejects.
  function scopeClause() {
    const placeholders = safeIds.map(() => next()).join(", ");
    for (const id of safeIds) params.push(id);
    return placeholders;
  }

  const { cte, from } = fromSql(plan, plan.scopeInCte ? scopeClause() : "");

  const where: string[] = [];
  if (!plan.scopeInCte) {
    where.push(`${plan.scopeColumn} IN (${scopeClause()})`);
  }
  for (const clause of plan.whereClauses) {
    let sql = clause.sql;
    for (const p of clause.params) {
      sql = sql.replace("?", next());
      params.push(p);
    }
    where.push(sql);
  }

  const whereSql = where.length ? `\nWHERE ${where.join("\n  AND ")}` : "";

  const sql = `${cte}SELECT\n${selectSql(plan)}\n${from}${joinSql(plan)}${whereSql}${groupBySql(plan)}${orderLimitSql(plan)}`;
  return { sql, params };
}

/** SQL literal for the display string (values inlined, read-only preview). */
function literal(value: string | number): string {
  if (typeof value === "number") return String(value);
  return `'${value.replace(/'/g, "''")}'`;
}

export function renderDisplaySql(
  plan: QueryPlan,
  opts: { teamName: string; scrimCount?: number }
): string {
  const scopeComment =
    opts.scrimCount !== undefined
      ? `/* ${opts.teamName}: ${opts.scrimCount} scrim${opts.scrimCount === 1 ? "" : "s"} */`
      : `/* ${opts.teamName} */`;

  const scopePredicate = `${plan.scopeColumn} IN (${scopeComment})`;

  let cte = "";
  let from: string;
  if (plan.needsFinalRows) {
    cte = `WITH final_rows AS (
  SELECT DISTINCT ON (ps."MapDataId", ps."player_name", ps."player_hero") ps.*
  FROM "PlayerStat" ps
  WHERE ${scopePredicate}
  ORDER BY ps."MapDataId", ps."player_name", ps."player_hero", ps."round_number" DESC
)
`;
    from = `FROM final_rows ${plan.baseAlias}`;
  } else {
    from = `FROM ${quoteIdent(plan.baseTable)} ${plan.baseAlias}`;
  }

  const where: string[] = [];
  if (!plan.scopeInCte) where.push(scopePredicate);
  for (const clause of plan.whereClauses) {
    let sql = clause.sql;
    for (const p of clause.params) sql = sql.replace("?", literal(p));
    where.push(sql);
  }
  const whereSql = where.length ? `\nWHERE ${where.join("\n  AND ")}` : "";

  return `${cte}SELECT\n${selectSql(plan)}\n${from}${joinSql(plan)}${whereSql}${groupBySql(plan)}${orderLimitSql(plan)}`;
}

/** A compact, human-readable summary of one selection for the hover layer. */
export function describeAggregation(agg: Aggregation): string {
  return AGG_SQL_LABELS[agg];
}

const OP_SYMBOLS: Record<string, string> = {
  eq: "=",
  neq: "<>",
  in: "IN",
  nin: "NOT IN",
  gt: ">",
  gte: ">=",
  lt: "<",
  lte: "<=",
};

/**
 * Render a computed dataset's plan as readable pseudo-SQL for the underlay.
 * Computed analyses don't run as SQL, but expressing the post-processing this
 * way keeps the technical layer honest about what's grouped and filtered.
 */
export function renderComputedPlan(
  spec: QuerySpec,
  opts: { teamName: string; scrimCount?: number }
): string {
  const ds = getDataset(spec.dataset);
  const scope =
    opts.scrimCount !== undefined
      ? `/* ${opts.teamName}: ${opts.scrimCount} scrim${opts.scrimCount === 1 ? "" : "s"} */`
      : `/* ${opts.teamName} */`;

  const selects = spec.metrics.map((ref) => {
    const m = getMetric(spec.dataset, ref.metric);
    if (!m) return ref.metric;
    if (m.column === null || ref.agg === "count") return `COUNT(*) AS ${m.id}`;
    if (ref.agg === "per10" || ref.agg === "ratio") {
      const denominator =
        m.denominatorColumn ?? (ref.agg === "per10" ? "time_played" : null);
      const scale =
        (m.denominatorScale ?? (ref.agg === "per10" ? 600 : 1)) *
        (m.scale ?? 1);
      if (denominator) {
        return `(SUM(${m.column}) / NULLIF(SUM(${denominator}), 0)) * ${scale} AS ${m.id}`;
      }
    }
    const scaled = m.scale ? ` * ${m.scale}` : "";
    return `${AGG_SQL_LABELS[ref.agg]}(${m.column})${scaled} AS ${m.id}`;
  });

  const groupExprs = spec.dimensions.flatMap((id) => {
    const d = getDimension(spec.dataset, id);
    return d ? [d.column] : [];
  });

  const whereExprs = spec.filters.flatMap((f) => {
    const fd = getFilter(spec.dataset, f.field);
    if (!fd) return [];
    const value = Array.isArray(f.value)
      ? `(${f.value.map((v) => literal(v)).join(", ")})`
      : literal(f.value);
    return [`${fd.column} ${OP_SYMBOLS[f.op] ?? f.op} ${value}`];
  });

  let out = `ANALYZE ${ds.noun} ${scope}\nFROM ${(ds.sourceTables ?? [ds.table]).join(", ")}`;
  if (whereExprs.length) out += `\nWHERE ${whereExprs.join("\n  AND ")}`;
  if (groupExprs.length) out += `\nGROUP BY ${groupExprs.join(", ")}`;
  out += `\nSELECT ${selects.join(", ")}`;
  if (spec.sort) {
    out += `\nORDER BY ${spec.sort.key} ${spec.sort.dir.toUpperCase()}`;
  }
  out += `\nLIMIT ${spec.limit ?? 1000}`;
  return out;
}
