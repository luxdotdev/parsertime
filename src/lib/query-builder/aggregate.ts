import {
  getDimension,
  getFilter,
  getMetric,
  type MetricDef,
} from "@/lib/query-builder/registry";
import {
  metricKey,
  type Aggregation,
  type QueryFilter,
  type QuerySpec,
  type ResultColumn,
  type ResultRow,
} from "@/lib/query-builder/types";

/**
 * Pure, in-memory aggregation for computed datasets. A compute function emits
 * one row per underlying unit (e.g. per teamfight); this applies the spec's
 * filters, group-by, metric aggregations, sort, and limit exactly the way the
 * SQL compiler does for SQL datasets, so the result renders identically.
 */

export type ComputedRow = Record<string, string | number | null>;

function matchesFilter(
  row: ComputedRow,
  filter: QueryFilter,
  field: string
): boolean {
  const cell = row[field];
  const cellValues =
    typeof cell === "string" && cell.includes("|") ? cell.split("|") : null;
  if (filter.op === "in" || filter.op === "nin") {
    const values = (
      Array.isArray(filter.value) ? filter.value : [filter.value]
    ).map(String);
    if (values.length === 0) return true;
    const hit = cellValues
      ? values.some((value) => cellValues.includes(value))
      : values.includes(String(cell));
    return filter.op === "in" ? hit : !hit;
  }
  const target = Array.isArray(filter.value) ? filter.value[0] : filter.value;
  switch (filter.op) {
    case "eq":
      return cellValues
        ? cellValues.includes(String(target))
        : String(cell) === String(target);
    case "neq":
      return cellValues
        ? !cellValues.includes(String(target))
        : String(cell) !== String(target);
    case "gt":
      return Number(cell) > Number(target);
    case "gte":
      return Number(cell) >= Number(target);
    case "lt":
      return Number(cell) < Number(target);
    case "lte":
      return Number(cell) <= Number(target);
    default:
      return true;
  }
}

function aggregate(
  values: number[],
  agg: "sum" | "avg" | "max" | "min" | "count" | "per10" | "ratio",
  count: number
): number {
  switch (agg) {
    case "count":
      return count;
    case "sum":
      return values.reduce((a, b) => a + b, 0);
    case "avg":
      return values.length
        ? values.reduce((a, b) => a + b, 0) / values.length
        : 0;
    case "max":
      return values.length ? Math.max(...values) : 0;
    case "min":
      return values.length ? Math.min(...values) : 0;
    case "per10":
    case "ratio":
      return 0;
    default:
      return 0;
  }
}

function ratioAggregate(
  bucket: ComputedRow[],
  numeratorField: string | null,
  denominatorField: string | undefined,
  scale: number
): number {
  if (!numeratorField || !denominatorField) return 0;

  let numerator = 0;
  let denominator = 0;
  for (const row of bucket) {
    const n = Number(row[numeratorField]);
    const d = Number(row[denominatorField]);
    if (!Number.isNaN(n)) numerator += n;
    if (!Number.isNaN(d)) denominator += d;
  }

  return denominator === 0 ? 0 : (numerator / denominator) * scale;
}

function aggregateMetricValue(
  bucket: ComputedRow[],
  metric: MetricDef,
  agg: Aggregation
): number {
  const field = metric.column;
  const values =
    field === null
      ? []
      : bucket.map((r) => Number(r[field])).filter((n) => !Number.isNaN(n));
  let value =
    agg === "per10" || agg === "ratio"
      ? ratioAggregate(
          bucket,
          field,
          metric.denominatorColumn,
          metric.denominatorScale ?? (agg === "per10" ? 600 : 1)
        )
      : aggregate(values, agg, bucket.length);
  if (metric.scale !== undefined) value *= metric.scale;
  return value;
}

function matchesAggregateFilter(
  bucket: ComputedRow[],
  metric: MetricDef,
  filter: QueryFilter,
  agg: Aggregation
): boolean {
  const value = aggregateMetricValue(bucket, metric, agg);
  if (filter.op === "in" || filter.op === "nin") {
    const values = Array.isArray(filter.value) ? filter.value : [filter.value];
    const hit = values.some((target) => value === Number(target));
    return filter.op === "in" ? hit : !hit;
  }
  const target = Array.isArray(filter.value) ? filter.value[0] : filter.value;
  switch (filter.op) {
    case "eq":
      return value === Number(target);
    case "neq":
      return value !== Number(target);
    case "gt":
      return value > Number(target);
    case "gte":
      return value >= Number(target);
    case "lt":
      return value < Number(target);
    case "lte":
      return value <= Number(target);
    default:
      return true;
  }
}

export function aggregateComputed(
  rows: ComputedRow[],
  spec: QuerySpec
): { columns: ResultColumn[]; rows: ResultRow[] } {
  // Resolve the dimensions and metrics from the registry.
  const dims = spec.dimensions.flatMap((id) => {
    const def = getDimension(spec.dataset, id);
    return def ? [{ id: def.id, label: def.label, field: def.column }] : [];
  });
  const metrics = spec.metrics.flatMap((ref) => {
    const def = getMetric(spec.dataset, ref.metric);
    if (!def) return [];
    return [
      {
        metric: def,
        key: metricKey(ref),
        label: def.label,
        agg: ref.agg,
        precision: def.precision,
        unit: def.unit,
      },
    ];
  });

  const rowFilters: QueryFilter[] = [];
  const aggregateFilters: {
    filter: QueryFilter;
    metric: MetricDef;
    agg: Aggregation;
  }[] = [];
  for (const f of spec.filters) {
    const def = getFilter(spec.dataset, f.field);
    if (def?.aggregate) {
      const metric = getMetric(spec.dataset, f.field);
      if (metric) {
        aggregateFilters.push({ filter: f, metric, agg: def.aggregate });
        continue;
      }
    }
    rowFilters.push(f);
  }

  // Apply row filters before grouping.
  let filtered = rows;
  for (const f of rowFilters) {
    const def = getFilter(spec.dataset, f.field);
    if (!def) continue;
    filtered = filtered.filter((row) => matchesFilter(row, f, def.column));
  }

  // Group by the dimension tuple.
  const groups = new Map<string, ComputedRow[]>();
  for (const row of filtered) {
    const key = JSON.stringify(dims.map((d) => row[d.field] ?? null));
    const bucket = groups.get(key);
    if (bucket) bucket.push(row);
    else groups.set(key, [row]);
  }

  const columns: ResultColumn[] = [
    ...dims.map((d) => ({
      key: d.id,
      label: d.label,
      kind: "dimension" as const,
    })),
    ...metrics.map((m) => ({
      key: m.key,
      label: m.label,
      kind: "metric" as const,
      precision: m.precision,
      unit: m.unit,
    })),
  ];

  const resultRows: ResultRow[] = [];
  for (const bucket of groups.values()) {
    if (
      aggregateFilters.some(
        ({ filter, metric, agg }) =>
          !matchesAggregateFilter(bucket, metric, filter, agg)
      )
    ) {
      continue;
    }
    const row: ResultRow = {};
    for (const d of dims) {
      const value = bucket[0][d.field];
      row[d.id] = value === undefined ? null : value;
    }
    for (const m of metrics) {
      row[m.key] = aggregateMetricValue(bucket, m.metric, m.agg);
    }
    resultRows.push(row);
  }

  // Sort + limit, matching the SQL path (NULLS last, desc/asc).
  if (spec.sort && resultRows.some((r) => spec.sort!.key in r)) {
    const { key, dir } = spec.sort;
    const sign = dir === "asc" ? 1 : -1;
    resultRows.sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      if (av === null) return 1;
      if (bv === null) return -1;
      if (typeof av === "number" && typeof bv === "number")
        return (av - bv) * sign;
      return String(av).localeCompare(String(bv)) * sign;
    });
  }

  const limit = spec.limit ?? 1000;
  return { columns, rows: resultRows.slice(0, limit) };
}
