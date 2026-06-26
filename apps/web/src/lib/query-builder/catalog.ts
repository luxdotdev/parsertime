import {
  DATASET_LIST,
  getDataset,
  type FilterValueType,
} from "@/lib/query-builder/registry";
import type {
  Aggregation,
  DatasetId,
  FilterOperator,
} from "@/lib/query-builder/types";

/**
 * Compact, model-facing shaping of the query-builder registry. Pure data
 * transforms only — no prisma — so this is safe to unit test and to call from
 * the AI tool layer. The registry stays the single source of truth; this file
 * just selects the fields a caller needs to build a QuerySpec.
 */

export type CatalogDatasetSummary = {
  id: DatasetId;
  label: string;
  noun: string;
  description: string;
  grainNote: string;
  kind: "sql" | "computed";
};

export type CatalogMetric = {
  id: string;
  label: string;
  description: string;
  allowedAggs: Aggregation[];
  defaultAgg: Aggregation;
  unit?: string;
  lowerIsBetter?: boolean;
};

export type CatalogDimension = { id: string; label: string };

export type CatalogFilter = {
  id: string;
  label: string;
  valueType: FilterValueType;
  operators: FilterOperator[];
  /** fixed option list for enum filters */
  options?: { value: string; label: string }[];
  /** true when valid values are team-scoped and must be resolved at query time */
  dynamicOptions: boolean;
};

export type DatasetCatalog = CatalogDatasetSummary & {
  metrics: CatalogMetric[];
  dimensions: CatalogDimension[];
  filters: CatalogFilter[];
};

export function buildCatalogIndex(): CatalogDatasetSummary[] {
  return DATASET_LIST.map((d) => ({
    id: d.id,
    label: d.label,
    noun: d.noun,
    description: d.description,
    grainNote: d.grainNote,
    kind: d.kind ?? "sql",
  }));
}

export function buildDatasetCatalog(datasetId: DatasetId): DatasetCatalog {
  const d = getDataset(datasetId);
  return {
    id: d.id,
    label: d.label,
    noun: d.noun,
    description: d.description,
    grainNote: d.grainNote,
    kind: d.kind ?? "sql",
    metrics: d.metrics.map((m) => ({
      id: m.id,
      label: m.label,
      description: m.description,
      allowedAggs: m.allowedAggs,
      defaultAgg: m.defaultAgg,
      unit: m.unit,
      lowerIsBetter: m.lowerIsBetter,
    })),
    dimensions: d.dimensions.map((dim) => ({ id: dim.id, label: dim.label })),
    filters: d.filters.map((f) => ({
      id: f.id,
      label: f.label,
      valueType: f.valueType,
      operators: f.operators,
      options: f.enumOptions,
      dynamicOptions: Boolean(f.optionsColumn) && !f.enumOptions,
    })),
  };
}
