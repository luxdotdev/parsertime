"use client";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AGG_LABELS,
  getDataset,
  type DimensionDef,
  type FilterDef,
  type MetricDef,
} from "@/lib/query-builder/registry";
import {
  DATASETS,
  type Aggregation,
  type DatasetId,
  type FilterOperator,
  type MetricRef,
  type QueryFilter,
  type TimeScope,
  type ViewableTeam,
} from "@/lib/query-builder/types";
import { cn } from "@/lib/utils";
import { CheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

const editorListClass = "max-h-64";

function CheckRow({ selected }: { selected: boolean }) {
  return (
    <CheckIcon
      className={cn("ml-auto size-4", selected ? "opacity-100" : "opacity-0")}
      aria-hidden="true"
    />
  );
}

// --- Dataset ----------------------------------------------------------------
export function DatasetEditor({
  value,
  onChange,
  close,
}: {
  value: DatasetId;
  onChange: (id: DatasetId) => void;
  close: () => void;
}) {
  return (
    <Command>
      <CommandList className={editorListClass}>
        <CommandGroup>
          {DATASETS.map((id) => {
            const ds = getDataset(id);
            return (
              <CommandItem
                key={id}
                value={ds.label}
                onSelect={() => {
                  onChange(id);
                  close();
                }}
                className="flex-col items-start gap-0.5"
              >
                <span className="flex w-full items-center">
                  {ds.label}
                  <CheckRow selected={value === id} />
                </span>
                <span className="text-muted-foreground text-xs">
                  {ds.description}
                </span>
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

// --- Team -------------------------------------------------------------------
export function TeamEditor({
  teams,
  value,
  onChange,
  close,
}: {
  teams: ViewableTeam[];
  value: number | null;
  onChange: (id: number) => void;
  close: () => void;
}) {
  const t = useTranslations("queryBuilderPage");
  return (
    <Command>
      <CommandInput placeholder={t("searchPlaceholder")} />
      <CommandList className={editorListClass}>
        <CommandEmpty>{t("noResults")}</CommandEmpty>
        <CommandGroup>
          {teams.map((team) => (
            <CommandItem
              key={team.id}
              value={`${team.name} ${team.id}`}
              onSelect={() => {
                onChange(team.id);
                close();
              }}
            >
              {team.name}
              <CheckRow selected={value === team.id} />
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

// --- Metric (aggregation + which metric) ------------------------------------
export function MetricEditor({
  dataset,
  value,
  onChange,
  close,
}: {
  dataset: DatasetId;
  value: MetricRef;
  onChange: (ref: MetricRef) => void;
  close: () => void;
}) {
  const t = useTranslations("queryBuilderPage");
  const def = getDataset(dataset);
  const current = def.metrics.find((m) => m.id === value.metric);
  const allowedAggs = current?.allowedAggs ?? [];

  return (
    <div>
      {current && allowedAggs.length > 1 && (
        <div className="border-border flex flex-wrap gap-1 border-b p-2">
          {allowedAggs.map((agg) => (
            <button
              key={agg}
              type="button"
              onClick={() => onChange({ ...value, agg })}
              className={cn(
                "rounded-md px-2 py-1 text-xs transition-colors",
                value.agg === agg
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {AGG_LABELS[agg]}
            </button>
          ))}
        </div>
      )}
      <Command>
        <CommandInput placeholder={t("pickMetric")} />
        <CommandList className={editorListClass}>
          <CommandEmpty>{t("noResults")}</CommandEmpty>
          <CommandGroup>
            {def.metrics.map((metric) => (
              <CommandItem
                key={metric.id}
                value={metric.label}
                onSelect={() => {
                  const nextAgg: Aggregation = metric.allowedAggs.includes(
                    value.agg
                  )
                    ? value.agg
                    : metric.defaultAgg;
                  onChange({ metric: metric.id, agg: nextAgg });
                  close();
                }}
              >
                {metric.label}
                <CheckRow selected={value.metric === metric.id} />
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  );
}

/** Picker used by the "+ add" affordance for a fresh metric. */
export function MetricAddEditor({
  dataset,
  selected,
  onAdd,
  close,
}: {
  dataset: DatasetId;
  selected: string[];
  onAdd: (metric: MetricDef) => void;
  close: () => void;
}) {
  const t = useTranslations("queryBuilderPage");
  const def = getDataset(dataset);
  return (
    <Command>
      <CommandInput placeholder={t("pickMetric")} />
      <CommandList className={editorListClass}>
        <CommandEmpty>{t("noResults")}</CommandEmpty>
        <CommandGroup>
          {def.metrics.map((metric) => (
            <CommandItem
              key={metric.id}
              value={metric.label}
              onSelect={() => {
                onAdd(metric);
                close();
              }}
            >
              {metric.label}
              <CheckRow selected={selected.includes(metric.id)} />
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

// --- Dimensions -------------------------------------------------------------
export function DimensionEditor({
  dataset,
  selected,
  onToggle,
}: {
  dataset: DatasetId;
  selected: string[];
  onToggle: (dim: DimensionDef) => void;
}) {
  const t = useTranslations("queryBuilderPage");
  const def = getDataset(dataset);
  return (
    <Command>
      <CommandInput placeholder={t("pickDimension")} />
      <CommandList className={editorListClass}>
        <CommandEmpty>{t("noResults")}</CommandEmpty>
        <CommandGroup>
          {def.dimensions.map((dim) => (
            <CommandItem
              key={dim.id}
              value={dim.label}
              onSelect={() => onToggle(dim)}
            >
              {dim.label}
              <CheckRow selected={selected.includes(dim.id)} />
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

// --- Filters ----------------------------------------------------------------
const OP_LABEL_KEYS: Record<FilterOperator, string> = {
  eq: "opEq",
  neq: "opNeq",
  in: "opIn",
  gt: "opGt",
  gte: "opGte",
  lt: "opLt",
  lte: "opLte",
};

export function FilterAddEditor({
  dataset,
  onPick,
  close,
}: {
  dataset: DatasetId;
  onPick: (filter: FilterDef) => void;
  close: () => void;
}) {
  const t = useTranslations("queryBuilderPage");
  const def = getDataset(dataset);
  return (
    <Command>
      <CommandInput placeholder={t("pickFilter")} />
      <CommandList className={editorListClass}>
        <CommandEmpty>{t("noResults")}</CommandEmpty>
        <CommandGroup>
          {def.filters.map((filter) => (
            <CommandItem
              key={filter.id}
              value={filter.label}
              onSelect={() => {
                onPick(filter);
                close();
              }}
            >
              {filter.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

export function FilterEditor({
  filter,
  value,
  onChange,
  fetchOptions,
}: {
  filter: FilterDef;
  value: QueryFilter;
  onChange: (next: QueryFilter) => void;
  fetchOptions: (filterId: string) => Promise<string[]>;
}) {
  const t = useTranslations("queryBuilderPage");
  const [options, setOptions] = useState<string[]>(
    filter.enumOptions?.map((o) => o.value) ?? []
  );
  const [loading, setLoading] = useState(false);
  const isDynamic = !filter.enumOptions && filter.valueType !== "number";
  const isMulti = value.op === "in";

  useEffect(() => {
    let active = true;
    if (isDynamic) {
      setLoading(true);
      void fetchOptions(filter.id).then((opts) => {
        if (active) {
          setOptions(opts);
          setLoading(false);
        }
      });
    }
    return () => {
      active = false;
    };
  }, [filter.id, isDynamic, fetchOptions]);

  const selectedValues = Array.isArray(value.value)
    ? value.value.map(String)
    : value.value !== "" && value.value !== undefined
      ? [String(value.value)]
      : [];

  function setOp(op: FilterOperator) {
    if (op === "in") {
      onChange({ ...value, op, value: selectedValues });
    } else {
      onChange({ ...value, op, value: selectedValues[0] ?? "" });
    }
  }

  function toggleValue(v: string) {
    if (isMulti) {
      const set = new Set(selectedValues);
      if (set.has(v)) set.delete(v);
      else set.add(v);
      onChange({ ...value, value: Array.from(set) });
    } else {
      onChange({ ...value, value: v });
    }
  }

  function optionLabel(v: string) {
    return filter.enumOptions?.find((o) => o.value === v)?.label ?? v;
  }

  return (
    <div className="space-y-2 p-2">
      <div className="flex flex-wrap gap-1">
        {filter.operators.map((op) => (
          <button
            key={op}
            type="button"
            onClick={() => setOp(op)}
            className={cn(
              "rounded-md px-2 py-1 text-xs transition-colors",
              value.op === op
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {t(OP_LABEL_KEYS[op])}
          </button>
        ))}
      </div>

      {filter.valueType === "number" ? (
        <div className="space-y-1.5">
          <Label htmlFor={`filter-${filter.id}`} className="text-xs">
            {filter.label}
            {filter.unit ? ` (${filter.unit})` : ""}
          </Label>
          <Input
            id={`filter-${filter.id}`}
            type="number"
            inputMode="decimal"
            value={
              typeof value.value === "number" || typeof value.value === "string"
                ? String(value.value)
                : ""
            }
            onChange={(e) =>
              onChange({
                ...value,
                value: e.target.value === "" ? "" : Number(e.target.value),
              })
            }
          />
        </div>
      ) : (
        <Command>
          {options.length > 8 && (
            <CommandInput placeholder={t("searchPlaceholder")} />
          )}
          <CommandList className="max-h-52">
            <CommandEmpty>
              {loading ? t("loadingOptions") : t("noOptions")}
            </CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt}
                  value={optionLabel(opt)}
                  onSelect={() => toggleValue(opt)}
                >
                  {optionLabel(opt)}
                  <CheckRow selected={selectedValues.includes(opt)} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      )}
    </div>
  );
}

// --- Time scope -------------------------------------------------------------
export function TimeScopeEditor({
  value,
  onChange,
}: {
  value: TimeScope;
  onChange: (next: TimeScope) => void;
}) {
  const t = useTranslations("queryBuilderPage");
  return (
    <div className="space-y-3 p-3">
      <div className="flex flex-col gap-1">
        {(["all", "lastN", "dateRange"] as const).map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() =>
              onChange(
                kind === "lastN"
                  ? { kind, lastN: value.lastN ?? 10 }
                  : kind === "dateRange"
                    ? { kind, from: value.from, to: value.to }
                    : { kind: "all" }
              )
            }
            className={cn(
              "flex items-center rounded-md px-2 py-1.5 text-sm transition-colors",
              value.kind === kind
                ? "bg-primary/10 text-foreground ring-primary/40 ring-1"
                : "hover:bg-muted text-muted-foreground"
            )}
          >
            {t(
              kind === "all"
                ? "scopeAll"
                : kind === "lastN"
                  ? "scopeLastN"
                  : "scopeDateRange"
            )}
          </button>
        ))}
      </div>

      {value.kind === "lastN" && (
        <div className="space-y-1.5">
          <Label htmlFor="scope-lastn" className="text-xs">
            {t("lastNLabel")}
          </Label>
          <Input
            id="scope-lastn"
            type="number"
            min={1}
            max={500}
            value={value.lastN ?? 10}
            onChange={(e) =>
              onChange({
                kind: "lastN",
                lastN: Math.max(1, Number(e.target.value) || 1),
              })
            }
          />
        </div>
      )}

      {value.kind === "dateRange" && (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label htmlFor="scope-from" className="text-xs">
              {t("from")}
            </Label>
            <Input
              id="scope-from"
              type="date"
              value={value.from ?? ""}
              onChange={(e) =>
                onChange({ ...value, kind: "dateRange", from: e.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="scope-to" className="text-xs">
              {t("to")}
            </Label>
            <Input
              id="scope-to"
              type="date"
              value={value.to ?? ""}
              onChange={(e) =>
                onChange({ ...value, kind: "dateRange", to: e.target.value })
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}

// --- Sort -------------------------------------------------------------------
export function SortEditor({
  options,
  value,
  onChange,
  close,
}: {
  options: { key: string; label: string }[];
  value: { key: string; dir: "asc" | "desc" } | null;
  onChange: (next: { key: string; dir: "asc" | "desc" } | null) => void;
  close: () => void;
}) {
  const t = useTranslations("queryBuilderPage");
  return (
    <div className="space-y-2 p-2">
      <div className="flex gap-1">
        {(["desc", "asc"] as const).map((dir) => (
          <button
            key={dir}
            type="button"
            onClick={() =>
              value
                ? onChange({ ...value, dir })
                : options[0] && onChange({ key: options[0].key, dir })
            }
            className={cn(
              "flex-1 rounded-md px-2 py-1 text-xs transition-colors",
              value?.dir === dir
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {t(dir === "desc" ? "descending" : "ascending")}
          </button>
        ))}
      </div>
      <Command>
        <CommandList className={editorListClass}>
          <CommandEmpty>{t("noSortable")}</CommandEmpty>
          <CommandGroup>
            {options.map((opt) => (
              <CommandItem
                key={opt.key}
                value={opt.label}
                onSelect={() => {
                  onChange({ key: opt.key, dir: value?.dir ?? "desc" });
                  close();
                }}
              >
                {opt.label}
                <CheckRow selected={value?.key === opt.key} />
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full text-xs"
          onClick={() => {
            onChange(null);
            close();
          }}
        >
          {t("sortNone")}
        </Button>
      )}
    </div>
  );
}

// --- Limit ------------------------------------------------------------------
export function LimitEditor({
  value,
  onChange,
  close,
}: {
  value: number | null;
  onChange: (n: number | null) => void;
  close: () => void;
}) {
  const t = useTranslations("queryBuilderPage");
  const presets = [10, 20, 50, 100];
  return (
    <div className="space-y-2 p-3">
      <div className="flex flex-wrap gap-1">
        {presets.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => {
              onChange(n);
              close();
            }}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs transition-colors",
              value === n
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {n}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            onChange(null);
            close();
          }}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs transition-colors",
            value === null
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground"
          )}
        >
          {t("limitNone")}
        </button>
      </div>
      <Input
        type="number"
        min={1}
        max={1000}
        placeholder={t("limitCustom")}
        value={value ?? ""}
        onChange={(e) =>
          onChange(
            e.target.value === ""
              ? null
              : Math.min(1000, Math.max(1, Number(e.target.value)))
          )
        }
      />
    </div>
  );
}
