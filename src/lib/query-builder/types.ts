import { z } from "zod";

/**
 * Shared, client-safe types for the read-only query builder. No server-only
 * imports live in this file so it can be consumed by both the sentence-canvas
 * UI and the server compiler.
 */

export const DATASETS = [
  "player_stat",
  "calculated_stat",
  "kill",
  "hero_swap",
  "ultimate",
  "map",
  "teamfight",
  "rotation_death",
  "map_result",
  "player_map_performance",
  "ult_economy",
  "duel",
  "ability_impact",
  "ability_timing",
  "swap_impact",
  "hero_pool",
  "hero_pickrate",
  "enemy_hero",
  "ban_impact",
  "ult_combo",
  "role_trio",
  "roster_variant",
  "ult_impact",
  "ult_usage",
  "trend",
  "streak",
] as const;
export type DatasetId = (typeof DATASETS)[number];

export const AGGREGATIONS = [
  "sum",
  "avg",
  "max",
  "min",
  "count",
  "per10",
  "ratio",
] as const;
export type Aggregation = (typeof AGGREGATIONS)[number];

export const FILTER_OPERATORS = [
  "eq",
  "neq",
  "in",
  "nin",
  "gt",
  "gte",
  "lt",
  "lte",
] as const;
export type FilterOperator = (typeof FILTER_OPERATORS)[number];

export const metricRefSchema = z.object({
  /** id of a metric in the dataset registry */
  metric: z.string().min(1),
  agg: z.enum(AGGREGATIONS),
});
export type MetricRef = z.infer<typeof metricRefSchema>;

export const filterSchema = z.object({
  /** id of a filter in the dataset registry */
  field: z.string().min(1),
  op: z.enum(FILTER_OPERATORS),
  value: z.union([
    z.string(),
    z.number(),
    z.array(z.union([z.string(), z.number()])),
  ]),
});
export type QueryFilter = z.infer<typeof filterSchema>;

export const timeScopeSchema = z.object({
  kind: z.enum(["all", "lastN", "dateRange"]),
  /** number of most-recent scrims to include when kind === "lastN" */
  lastN: z.number().int().positive().max(500).optional(),
  /** ISO date (inclusive) when kind === "dateRange" */
  from: z.string().optional(),
  to: z.string().optional(),
});
export type TimeScope = z.infer<typeof timeScopeSchema>;

export const sortSchema = z.object({
  /** matches a result column key: a metric ref key or a dimension id */
  key: z.string().min(1),
  dir: z.enum(["asc", "desc"]),
});
export type QuerySort = z.infer<typeof sortSchema>;

export const querySpecSchema = z.object({
  dataset: z.enum(DATASETS),
  /** the team whose data this query reads; server re-checks view access */
  teamId: z.number().int().positive(),
  metrics: z.array(metricRefSchema).min(1).max(8),
  dimensions: z.array(z.string().min(1)).max(4).default([]),
  filters: z.array(filterSchema).max(12).default([]),
  timeScope: timeScopeSchema.default({ kind: "all" }),
  sort: sortSchema.nullable().default(null),
  limit: z.number().int().positive().max(1000).nullable().default(null),
});
export type QuerySpec = z.infer<typeof querySpecSchema>;

/** A unique, stable key for a selected metric (agg + metric id). */
export function metricKey(ref: MetricRef): string {
  return `${ref.agg}__${ref.metric}`;
}

/** One row of query output. Keys are dimension ids and metric keys. */
export type ResultRow = Record<string, string | number | null>;

export type ResultColumn = {
  key: string;
  label: string;
  /** "dimension" columns are categorical; "metric" columns are numeric. */
  kind: "dimension" | "metric";
  /** decimal places for numeric formatting; undefined for dimensions. */
  precision?: number;
  unit?: string;
};

export type QueryResult = {
  columns: ResultColumn[];
  rows: ResultRow[];
  /** the compiled SQL actually executed, for the technical underlay. */
  sql: string;
  /** distinct source tables touched, for the "tables it pulls from" reveal. */
  tables: string[];
  meta: {
    rowCount: number;
    teamId: number;
    teamName: string;
    scrimCount: number;
    durationMs: number;
    truncated: boolean;
  };
};

/** A team the current user is allowed to read in the query builder. */
export type ViewableTeam = { id: number; name: string };

export type RunQueryResponse =
  | { ok: true; result: QueryResult }
  | { ok: false; error: string };

export type SavedQuerySummary = {
  id: string;
  name: string;
  dataset: DatasetId;
  teamId: number;
  spec: QuerySpec;
  updatedAt: string;
};
