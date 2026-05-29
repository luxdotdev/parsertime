"use client";

import { CompiledQuery } from "@/components/query-builder/compiled-query";
import { QueryResults } from "@/components/query-builder/query-results";
import {
  SentenceCanvas,
  type DraftActions,
  type DraftSpec,
} from "@/components/query-builder/sentence-canvas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { downloadCsv } from "@/lib/query-builder/format";
import { buildPlan, renderDisplaySql } from "@/lib/query-builder/plan";
import {
  deleteSavedQuery,
  getFieldOptions,
  listSavedQueries,
  runQuery,
  saveQuery,
} from "@/lib/query-builder/server";
import type {
  MetricRef,
  QueryResult,
  QuerySort,
  QuerySpec,
  SavedQuerySummary,
  TimeScope,
  ViewableTeam,
} from "@/lib/query-builder/types";
import { BookmarkIcon, DownloadIcon, PlayIcon, Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

function initialDraft(defaultTeamId: number | null): DraftSpec {
  return {
    dataset: "player_stat",
    teamId: defaultTeamId,
    metrics: [{ metric: "eliminations", agg: "avg" }],
    dimensions: ["player"],
    filters: [],
    timeScope: { kind: "all" },
    sort: { key: "avg__eliminations", dir: "desc" },
    limit: 20,
  };
}

export function QueryBuilder({
  teams,
  savedQueries: initialSaved,
}: {
  teams: ViewableTeam[];
  savedQueries: SavedQuerySummary[];
}) {
  const t = useTranslations("queryBuilderPage");
  const defaultTeamId = teams[0]?.id ?? null;
  const [draft, setDraft] = useState<DraftSpec>(() =>
    initialDraft(defaultTeamId)
  );
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "ready">(
    "idle"
  );
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedQuerySummary[]>(initialSaved);
  const [saveName, setSaveName] = useState("");
  const [saveOpen, setSaveOpen] = useState(false);

  const teamName =
    teams.find((tm) => tm.id === draft.teamId)?.name ?? t("yourTeam");

  const actions: DraftActions = {
    setDataset: (dataset) =>
      setDraft((d) => ({
        ...d,
        dataset,
        // dataset-specific selections reset on switch
        metrics: [
          { metric: defaultMetricFor(dataset), agg: defaultAggFor(dataset) },
        ],
        dimensions: [],
        filters: [],
        sort: null,
      })),
    setTeamId: (teamId) => setDraft((d) => ({ ...d, teamId })),
    addMetric: (metric, agg) =>
      setDraft((d) =>
        d.metrics.some((m) => m.metric === metric)
          ? d
          : { ...d, metrics: [...d.metrics, { metric, agg }] }
      ),
    updateMetric: (index, ref) =>
      setDraft((d) => ({
        ...d,
        metrics: d.metrics.map((m, i) => (i === index ? ref : m)),
      })),
    removeMetric: (index) =>
      setDraft((d) => ({
        ...d,
        metrics: d.metrics.filter((_, i) => i !== index),
      })),
    toggleDimension: (id) =>
      setDraft((d) => ({
        ...d,
        dimensions: d.dimensions.includes(id)
          ? d.dimensions.filter((x) => x !== id)
          : [...d.dimensions, id],
      })),
    addFilter: (filter) =>
      setDraft((d) => ({ ...d, filters: [...d.filters, filter] })),
    updateFilter: (index, filter) =>
      setDraft((d) => ({
        ...d,
        filters: d.filters.map((f, i) => (i === index ? filter : f)),
      })),
    removeFilter: (index) =>
      setDraft((d) => ({
        ...d,
        filters: d.filters.filter((_, i) => i !== index),
      })),
    setTimeScope: (timeScope: TimeScope) =>
      setDraft((d) => ({ ...d, timeScope })),
    setSort: (sort: QuerySort | null) => setDraft((d) => ({ ...d, sort })),
    setLimit: (limit) => setDraft((d) => ({ ...d, limit })),
  };

  const fetchOptions = useCallback(
    async (filterId: string) => {
      if (!draft.teamId) return [];
      return getFieldOptions(draft.teamId, draft.dataset, filterId);
    },
    [draft.teamId, draft.dataset]
  );

  const candidateSpec: QuerySpec = useMemo(
    () => ({
      dataset: draft.dataset,
      teamId: draft.teamId ?? 0,
      metrics: draft.metrics,
      dimensions: draft.dimensions,
      filters: draft.filters,
      timeScope: draft.timeScope,
      sort: draft.sort,
      limit: draft.limit,
    }),
    [draft]
  );

  const previewSql = useMemo(() => {
    if (draft.metrics.length === 0) return null;
    try {
      return renderDisplaySql(buildPlan(candidateSpec), { teamName });
    } catch {
      return null;
    }
  }, [candidateSpec, teamName, draft.metrics.length]);

  const previewTables = useMemo(() => {
    if (draft.metrics.length === 0) return [];
    try {
      return buildPlan(candidateSpec).tables;
    } catch {
      return [];
    }
  }, [candidateSpec, draft.metrics.length]);

  const canRun = draft.teamId !== null && draft.metrics.length > 0;
  const runHint = !draft.teamId
    ? t("needTeam")
    : draft.metrics.length === 0
      ? t("needMetric")
      : null;

  async function run() {
    if (!canRun) return;
    setStatus("loading");
    setError(null);
    const response = await runQuery(candidateSpec);
    if (response.ok) {
      setResult(response.result);
      setStatus("ready");
    } else {
      setError(response.error);
      setStatus("error");
    }
  }

  function loadSaved(item: SavedQuerySummary) {
    setDraft({
      dataset: item.spec.dataset,
      teamId: teams.some((tm) => tm.id === item.spec.teamId)
        ? item.spec.teamId
        : defaultTeamId,
      metrics: item.spec.metrics,
      dimensions: item.spec.dimensions,
      filters: item.spec.filters,
      timeScope: item.spec.timeScope,
      sort: item.spec.sort,
      limit: item.spec.limit,
    });
    setStatus("idle");
    setResult(null);
    toast.success(t("loadedQuery", { name: item.name }));
  }

  async function save() {
    const response = await saveQuery(saveName, candidateSpec);
    if (response.ok) {
      toast.success(t("savedQuery"));
      setSaveName("");
      setSaveOpen(false);
      setSaved(await listSavedQueries());
    } else {
      toast.error(response.error ?? t("saveFailed"));
    }
  }

  async function remove(id: string) {
    await deleteSavedQuery(id);
    setSaved((s) => s.filter((q) => q.id !== id));
  }

  function exportCsv() {
    if (!result) return;
    downloadCsv(
      result.columns,
      result.rows,
      `parsertime-query-${result.meta.teamName}.csv`
        .replace(/\s+/g, "-")
        .toLowerCase()
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] flex-1 space-y-6 p-4 md:p-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground max-w-2xl text-sm">
          {t("subtitle")}
        </p>
      </header>

      <section
        aria-label={t("sentenceLabel")}
        className="border-border bg-card ring-foreground/5 rounded-xl border p-5 shadow-xs ring-1"
      >
        <SentenceCanvas
          draft={draft}
          actions={actions}
          teams={teams}
          fetchOptions={fetchOptions}
        />
      </section>

      <CompiledQuery sql={previewSql} tables={previewTables} />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          onClick={run}
          disabled={!canRun}
          className="gap-1.5"
        >
          <PlayIcon className="size-4" aria-hidden="true" />
          {status === "loading" ? t("running") : t("run")}
        </Button>
        {runHint && (
          <span className="text-muted-foreground text-xs">{runHint}</span>
        )}

        <div className="ml-auto flex items-center gap-2">
          <SavedMenu items={saved} onLoad={loadSaved} onRemove={remove} />
          <Popover open={saveOpen} onOpenChange={setSaveOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={!canRun}
              >
                <BookmarkIcon className="size-4" aria-hidden="true" />
                {t("save")}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 space-y-2">
              <p className="text-sm font-medium">{t("saveTitle")}</p>
              <Input
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder={t("saveNamePlaceholder")}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void save();
                }}
              />
              <Button
                type="button"
                size="sm"
                className="w-full"
                onClick={save}
                disabled={!saveName.trim()}
              >
                {t("saveConfirm")}
              </Button>
            </PopoverContent>
          </Popover>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={exportCsv}
            disabled={status !== "ready" || !result || result.rows.length === 0}
          >
            <DownloadIcon className="size-4" aria-hidden="true" />
            {t("export")}
          </Button>
        </div>
      </div>

      <QueryResults status={status} result={result} error={error} />
    </div>
  );
}

function SavedMenu({
  items,
  onLoad,
  onRemove,
}: {
  items: SavedQuerySummary[];
  onLoad: (item: SavedQuerySummary) => void;
  onRemove: (id: string) => void;
}) {
  const t = useTranslations("queryBuilderPage");
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-1.5">
          <BookmarkIcon className="size-4" aria-hidden="true" />
          {t("savedQueries")}
          {items.length > 0 && (
            <span className="text-muted-foreground font-mono text-xs">
              {items.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        {items.length === 0 ? (
          <p className="text-muted-foreground p-4 text-sm">{t("savedEmpty")}</p>
        ) : (
          <ul className="max-h-72 overflow-y-auto p-1">
            {items.map((item) => (
              <li key={item.id} className="group/saved flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onLoad(item)}
                  className="hover:bg-muted flex-1 rounded-sm px-2 py-1.5 text-left text-sm"
                >
                  <span className="block truncate">{item.name}</span>
                  <span className="text-muted-foreground font-mono text-[0.7rem] tracking-wider uppercase">
                    {item.dataset.replace("_", " ")}
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={t("deleteQuery")}
                  onClick={() => onRemove(item.id)}
                  className="text-muted-foreground hover:text-destructive rounded-sm p-1.5 opacity-0 transition-opacity group-hover/saved:opacity-100"
                >
                  <Trash2Icon className="size-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}

function defaultMetricFor(dataset: DraftSpec["dataset"]): string {
  if (dataset === "kill") return "kills";
  if (dataset === "calculated_stat") return "mvp_score";
  return "eliminations";
}

function defaultAggFor(dataset: DraftSpec["dataset"]): MetricRef["agg"] {
  if (dataset === "kill") return "count";
  return "avg";
}
