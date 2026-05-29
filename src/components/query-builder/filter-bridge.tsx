"use client";

import type {
  Filter,
  FilterFieldConfig,
  FilterFieldsConfig,
  FilterOperator,
} from "@/components/reui/filters";
import { createFilter } from "@/components/reui/filters";
import { getDataset, type FilterDef } from "@/lib/query-builder/registry";
import type {
  DatasetId,
  FilterOperator as SpecOperator,
  QueryFilter,
} from "@/lib/query-builder/types";
import {
  ClockIcon,
  CrosshairIcon,
  MapIcon,
  RotateCcwIcon,
  ShieldIcon,
  SwordsIcon,
  TagIcon,
  TrophyIcon,
  UserIcon,
  UsersIcon,
  ZapIcon,
} from "lucide-react";

const OPERATOR_LABELS: Record<SpecOperator, string> = {
  in: "is any of",
  nin: "is none of",
  eq: "is",
  neq: "is not",
  gte: "at least",
  gt: "more than",
  lte: "at most",
  lt: "less than",
};

const FIELD_ICONS: Record<string, React.ReactNode> = {
  hero: <SwordsIcon />,
  enemy_hero: <SwordsIcon />,
  hero_a: <SwordsIcon />,
  hero_b: <SwordsIcon />,
  response_hero: <SwordsIcon />,
  attacker_hero: <SwordsIcon />,
  victim_hero: <SwordsIcon />,
  player: <UserIcon />,
  tank: <UserIcon />,
  dps1: <UserIcon />,
  dps2: <UserIcon />,
  support1: <UserIcon />,
  support2: <UserIcon />,
  attacker: <UserIcon />,
  in_game_team: <UsersIcon />,
  map_type: <MapIcon />,
  role: <ShieldIcon />,
  enemy_role: <ShieldIcon />,
  ability: <ZapIcon />,
  side: <UsersIcon />,
  type: <TagIcon />,
  row_type: <TagIcon />,
  combo: <ZapIcon />,
  tag: <TagIcon />,
  used: <ZapIcon />,
  scenario: <TagIcon />,
  mirrored: <RotateCcwIcon />,
  first_side: <ZapIcon />,
  top_fight_opening_hero: <ZapIcon />,
  had_swap: <RotateCcwIcon />,
  swap_count: <RotateCcwIcon />,
  swap_count_bucket: <RotateCcwIcon />,
  first_swap_timing: <ClockIcon />,
  critical: <CrosshairIcon />,
  min_time_played: <ClockIcon />,
  ults_used: <ZapIcon />,
  result: <TrophyIcon />,
  first_pick: <CrosshairIcon />,
  first_ult: <ZapIcon />,
  reversal: <RotateCcwIcon />,
};

function fieldType(filter: FilterDef): FilterFieldConfig["type"] {
  if (filter.valueType === "number") return "number";
  return filter.operators.includes("in") ? "multiselect" : "select";
}

function operatorsFor(filter: FilterDef): FilterOperator[] {
  return filter.operators.map((op) => ({
    value: op,
    label: OPERATOR_LABELS[op],
  }));
}

/** Build the Filters field config for a dataset, with async option loading. */
export function buildFilterFields(
  dataset: DatasetId,
  loadOptions: (filterId: string) => Promise<string[]>
): FilterFieldsConfig {
  const def = getDataset(dataset);
  const fields: FilterFieldConfig[] = def.filters.map((filter) => ({
    key: filter.id,
    label: filter.label,
    icon: FIELD_ICONS[filter.id] ?? <TagIcon />,
    type: fieldType(filter),
    operators: operatorsFor(filter),
    defaultOperator: filter.operators[0],
    unit: filter.unit,
    placeholder: filter.unit ? filter.label : "Select",
    options: filter.enumOptions?.map((o) => ({
      value: o.value,
      label: o.label,
    })),
    loadOptions: filter.enumOptions
      ? undefined
      : () =>
          loadOptions(filter.id).then((values) =>
            values.map((v) => ({ value: v, label: v }))
          ),
  }));
  return [{ group: `${def.label} fields`, fields }];
}

const MULTI_OPS = new Set<SpecOperator>(["in", "nin"]);

/** Convert the Filters component model into validated query-spec filters. */
export function filtersToQuerySpec(filters: Filter[]): QueryFilter[] {
  const out: QueryFilter[] = [];
  for (const filter of filters) {
    const op = filter.operator as SpecOperator;
    if (MULTI_OPS.has(op)) {
      if (filter.values.length === 0) continue; // incomplete: skip
      out.push({ field: filter.field, op, value: filter.values });
    } else {
      if (filter.values.length === 0 || filter.values[0] === "") continue;
      out.push({ field: filter.field, op, value: filter.values[0] });
    }
  }
  return out;
}

/** Rehydrate the Filters component model from saved query-spec filters. */
export function querySpecToFilters(filters: QueryFilter[]): Filter[] {
  return filters.map((f) => {
    const values = Array.isArray(f.value)
      ? f.value
      : f.value === "" || f.value === undefined
        ? []
        : [f.value];
    return createFilter(f.field, f.op, values);
  });
}
