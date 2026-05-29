"use client";

import {
  Filters,
  type Filter,
  type FilterFieldsConfig,
} from "@/components/reui/filters";
import {
  DatasetEditor,
  DimensionEditor,
  LimitEditor,
  MetricAddEditor,
  MetricEditor,
  SortEditor,
  TeamEditor,
  TimeScopeEditor,
} from "@/components/query-builder/query-editors";
import {
  QueryToken,
  type TokenTech,
} from "@/components/query-builder/query-token";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AGG_LABELS,
  AGG_SQL_LABELS,
  getDataset,
  getMetric,
} from "@/lib/query-builder/registry";
import {
  metricKey,
  type DatasetId,
  type MetricRef,
  type QuerySort,
  type TimeScope,
  type ViewableTeam,
} from "@/lib/query-builder/types";
import { ListFilterIcon, PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

export type DraftSpec = {
  dataset: DatasetId;
  teamId: number | null;
  metrics: MetricRef[];
  dimensions: string[];
  timeScope: TimeScope;
  sort: QuerySort | null;
  limit: number | null;
};

export type DraftActions = {
  setDataset: (id: DatasetId) => void;
  setTeamId: (id: number) => void;
  addMetric: (id: string, agg: MetricRef["agg"]) => void;
  updateMetric: (index: number, ref: MetricRef) => void;
  removeMetric: (index: number) => void;
  toggleDimension: (id: string) => void;
  setTimeScope: (ts: TimeScope) => void;
  setSort: (sort: QuerySort | null) => void;
  setLimit: (n: number | null) => void;
};

function Connective({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-muted-foreground font-mono text-[0.8rem] lowercase">
      {children}
    </span>
  );
}

function AddButton({
  label,
  children,
}: {
  label: string;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className="border-border text-muted-foreground hover:border-primary/40 hover:text-foreground focus-visible:ring-ring/50 inline-flex size-6 items-center justify-center rounded-md border border-dashed align-middle transition-colors focus-visible:ring-[3px] focus-visible:outline-none"
        >
          <PlusIcon className="size-3.5" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        {children(() => setOpen(false))}
      </PopoverContent>
    </Popover>
  );
}

export function SentenceCanvas({
  draft,
  actions,
  teams,
  filterModel,
  onFilterModelChange,
  filterFields,
}: {
  draft: DraftSpec;
  actions: DraftActions;
  teams: ViewableTeam[];
  filterModel: Filter[];
  onFilterModelChange: (filters: Filter[]) => void;
  filterFields: FilterFieldsConfig;
}) {
  const t = useTranslations("queryBuilderPage");
  const dataset = getDataset(draft.dataset);
  const teamName = teams.find((tm) => tm.id === draft.teamId)?.name ?? null;

  const sortOptions = [
    ...draft.dimensions.flatMap((dimId) => {
      const dim = dataset.dimensions.find((d) => d.id === dimId);
      return dim ? [{ key: dim.id, label: dim.label }] : [];
    }),
    ...draft.metrics.flatMap((ref) => {
      const m = getMetric(draft.dataset, ref.metric);
      return m
        ? [{ key: metricKey(ref), label: `${aggPrefix(ref)}${m.label}` }]
        : [];
    }),
  ];

  function aggPrefix(ref: MetricRef): string {
    const m = getMetric(draft.dataset, ref.metric);
    if (!m) return "";
    const pureCount =
      m.allowedAggs.length === 1 && m.allowedAggs[0] === "count";
    return pureCount ? "" : `${AGG_LABELS[ref.agg]} `;
  }

  function metricLabel(ref: MetricRef): string {
    const m = getMetric(draft.dataset, ref.metric);
    if (!m) return ref.metric;
    return `${aggPrefix(ref)}${m.label}`;
  }

  function metricTech(ref: MetricRef): TokenTech {
    const m = getMetric(draft.dataset, ref.metric);
    if (!m) return { title: ref.metric, tables: [] };
    const expr =
      m.column === null || ref.agg === "count"
        ? "COUNT(*)"
        : `${AGG_SQL_LABELS[ref.agg]}(${m.column})`;
    return {
      title: m.statType ? `${expr} FILTER (stat = ${m.statType})` : expr,
      tables: [m.table],
      columns: m.column ? [m.column] : undefined,
      note: m.description,
    };
  }

  function timeScopeLabel(ts: TimeScope): string {
    if (ts.kind === "lastN") return t("scopeLastNValue", { n: ts.lastN ?? 10 });
    if (ts.kind === "dateRange") {
      if (ts.from && ts.to)
        return t("scopeRangeValue", { from: ts.from, to: ts.to });
      return t("scopeDateRange");
    }
    return t("scopeAllValue");
  }

  return (
    <div className="text-foreground flex flex-wrap items-center gap-x-1.5 gap-y-2.5 text-base">
      {/* FROM dataset */}
      <Connective>{t("clauseFrom")}</Connective>
      <QueryToken
        ariaLabel={t("editDataset")}
        tech={{
          title: `FROM "${dataset.table}"`,
          tables: [dataset.table],
          note: dataset.grainNote,
        }}
        editor={(close) => (
          <DatasetEditor
            value={draft.dataset}
            onChange={actions.setDataset}
            close={close}
          />
        )}
      >
        {dataset.label}
      </QueryToken>

      {/* SHOW metrics */}
      <Connective>{t("clauseShow")}</Connective>
      <span className="inline-flex flex-wrap items-center gap-1">
        {draft.metrics.map((ref, i) => (
          <QueryToken
            key={metricKey(ref)}
            ariaLabel={t("editMetric")}
            tech={metricTech(ref)}
            removable={draft.metrics.length > 1}
            onRemove={() => actions.removeMetric(i)}
            editor={(close) => (
              <MetricEditor
                dataset={draft.dataset}
                value={ref}
                onChange={(next) => actions.updateMetric(i, next)}
                close={close}
              />
            )}
          >
            {metricLabel(ref)}
          </QueryToken>
        ))}
        <AddButton label={t("addMetric")}>
          {(close) => (
            <MetricAddEditor
              dataset={draft.dataset}
              selected={draft.metrics.map((m) => m.metric)}
              onAdd={(m) => actions.addMetric(m.id, m.defaultAgg)}
              close={close}
            />
          )}
        </AddButton>
      </span>

      {/* PER dimensions */}
      <Connective>{t("clausePer")}</Connective>
      <span className="inline-flex flex-wrap items-center gap-1">
        {draft.dimensions.length === 0 && (
          <span className="text-muted-foreground italic">{t("overall")}</span>
        )}
        {draft.dimensions.map((dimId) => {
          const dim = dataset.dimensions.find((d) => d.id === dimId);
          if (!dim) return null;
          return (
            <QueryToken
              key={dimId}
              ariaLabel={t("editDimension")}
              tech={{
                title: `GROUP BY ${dim.column}`,
                tables: [dim.table],
                columns: [dim.column],
              }}
              removable
              onRemove={() => actions.toggleDimension(dimId)}
            >
              {dim.label}
            </QueryToken>
          );
        })}
        <AddButton label={t("addDimension")}>
          {() => (
            <DimensionEditor
              dataset={draft.dataset}
              selected={draft.dimensions}
              onToggle={(dim) => actions.toggleDimension(dim.id)}
            />
          )}
        </AddButton>
      </span>

      {/* FOR team */}
      <Connective>{t("clauseFor")}</Connective>
      <QueryToken
        ariaLabel={t("editTeam")}
        tone="team"
        tech={{
          title: teamName
            ? `scrimId IN (Scrim WHERE teamId = ${draft.teamId})`
            : "scrimId IN (…)",
          tables: ["Scrim"],
          note: t("teamScopeNote"),
        }}
        editor={(close) => (
          <TeamEditor
            teams={teams}
            value={draft.teamId}
            onChange={actions.setTeamId}
            close={close}
          />
        )}
      >
        {teamName ?? <span className="text-primary">{t("selectTeam")}</span>}
      </QueryToken>

      {/* WHERE filters */}
      <Connective>{t("clauseWhere")}</Connective>
      <Filters
        filters={filterModel}
        fields={filterFields}
        onChange={onFilterModelChange}
        enableShortcut
        shortcutKey="f"
        shortcutLabel="F"
        searchPlaceholder={t("searchFields")}
        emptyText={t("noResults")}
        noOptionsText={t("noOptions")}
        addFilterLabel={t("addFilter")}
        trigger={
          filterModel.length === 0 ? (
            <button
              type="button"
              className="border-border text-muted-foreground hover:border-primary/40 hover:text-foreground focus-visible:ring-ring/50 inline-flex items-center gap-1 rounded-md border border-dashed px-2 py-0.5 text-sm transition-colors focus-visible:ring-[3px] focus-visible:outline-none"
            >
              <ListFilterIcon className="size-3.5" aria-hidden="true" />
              {t("addFilter")}
            </button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label={t("addFilter")}
              className="border-dashed"
            >
              <PlusIcon className="size-4" aria-hidden="true" />
            </Button>
          )
        }
      />

      {/* ACROSS time scope */}
      <Connective>{t("clauseAcross")}</Connective>
      <QueryToken
        ariaLabel={t("editScope")}
        tech={{
          title: "ORDER BY Scrim.date DESC",
          tables: ["Scrim"],
          columns: ["date"],
          note: t("scopeNote"),
        }}
        editor={() => (
          <TimeScopeEditor
            value={draft.timeScope}
            onChange={actions.setTimeScope}
          />
        )}
      >
        {timeScopeLabel(draft.timeScope)}
      </QueryToken>

      {/* SORTED BY */}
      <Connective>{t("clauseSortedBy")}</Connective>
      <QueryToken
        ariaLabel={t("editSort")}
        tech={{
          title: draft.sort
            ? `ORDER BY ${draft.sort.key} ${draft.sort.dir.toUpperCase()}`
            : "ORDER BY —",
          tables: [dataset.table],
        }}
        editor={(close) => (
          <SortEditor
            options={sortOptions}
            value={draft.sort}
            onChange={actions.setSort}
            close={close}
          />
        )}
      >
        {draft.sort
          ? `${sortOptions.find((o) => o.key === draft.sort?.key)?.label ?? draft.sort.key} ${draft.sort.dir === "desc" ? "↓" : "↑"}`
          : t("sortDefault")}
      </QueryToken>

      <Connective>{t("clauseTop")}</Connective>
      <QueryToken
        ariaLabel={t("editLimit")}
        tech={{
          title: `LIMIT ${draft.limit ?? 1000}`,
          tables: [dataset.table],
        }}
        editor={(close) => (
          <LimitEditor
            value={draft.limit}
            onChange={actions.setLimit}
            close={close}
          />
        )}
      >
        {draft.limit ? t("topValue", { n: draft.limit }) : t("limitAll")}
      </QueryToken>
      <Connective>.</Connective>
    </div>
  );
}
