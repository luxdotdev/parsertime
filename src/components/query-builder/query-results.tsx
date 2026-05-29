"use client";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMetric } from "@/lib/query-builder/format";
import type { QueryResult, ResultColumn } from "@/lib/query-builder/types";
import { cn } from "@/lib/utils";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  BarChart3Icon,
  TableIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";

type View = "table" | "chart";

const TEMPORAL_DIMENSIONS = new Set(["scrim", "date", "map"]);
const MAX_CHART_ROWS = 30;

export function QueryResults({
  status,
  result,
  error,
}: {
  status: "idle" | "loading" | "error" | "ready";
  result: QueryResult | null;
  error: string | null;
}) {
  const t = useTranslations("queryBuilderPage");
  const [view, setView] = useState<View>("table");
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(
    null
  );

  const dimensions =
    result?.columns.filter((c) => c.kind === "dimension") ?? [];
  const metrics = result?.columns.filter((c) => c.kind === "metric") ?? [];
  const canChart = Boolean(
    result && dimensions.length >= 1 && metrics.length >= 1
  );

  const sortedRows = useMemo(() => {
    if (!result) return [];
    if (!sort) return result.rows;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...result.rows].sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      if (av === null) return 1;
      if (bv === null) return -1;
      if (typeof av === "number" && typeof bv === "number")
        return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [result, sort]);

  if (status === "idle") {
    return <EmptyState title={t("emptyTitle")} body={t("emptyBody")} />;
  }
  if (status === "loading") {
    return <LoadingState />;
  }
  if (status === "error") {
    return (
      <EmptyState
        tone="error"
        title={t("errorTitle")}
        body={error ?? t("errorBody")}
      />
    );
  }
  if (!result) return null;
  if (result.rows.length === 0) {
    return <EmptyState title={t("zeroTitle")} body={t("zeroBody")} />;
  }

  function toggleSort(key: string) {
    setSort((prev) =>
      prev?.key === key
        ? prev.dir === "desc"
          ? { key, dir: "asc" }
          : null
        : { key, dir: "desc" }
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ResultMeta result={result} />
        <div className="border-border bg-muted/50 inline-flex rounded-md border p-0.5">
          <ViewButton
            active={view === "table"}
            onClick={() => setView("table")}
            label={t("viewTable")}
            icon={<TableIcon className="size-4" aria-hidden="true" />}
          />
          <ViewButton
            active={view === "chart"}
            onClick={() => setView("chart")}
            disabled={!canChart}
            label={t("viewChart")}
            icon={<BarChart3Icon className="size-4" aria-hidden="true" />}
          />
        </div>
      </div>

      {view === "table" ? (
        <div className="border-border overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                {result.columns.map((col) => (
                  <TableHead
                    key={col.key}
                    className={cn(
                      "h-9 font-mono text-[0.7rem] tracking-wider uppercase",
                      col.kind === "metric" && "text-right"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className={cn(
                        "hover:text-foreground inline-flex items-center gap-1 transition-colors",
                        col.kind === "metric" && "flex-row-reverse"
                      )}
                    >
                      {col.label}
                      {sort?.key === col.key &&
                        (sort.dir === "desc" ? (
                          <ArrowDownIcon
                            className="size-3"
                            aria-hidden="true"
                          />
                        ) : (
                          <ArrowUpIcon className="size-3" aria-hidden="true" />
                        ))}
                    </button>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRows.map((row) => (
                <TableRow
                  key={JSON.stringify(result.columns.map((c) => row[c.key]))}
                >
                  {result.columns.map((col) => (
                    <TableCell
                      key={col.key}
                      className={cn(
                        col.kind === "metric"
                          ? "text-right font-mono tabular-nums"
                          : "text-foreground"
                      )}
                    >
                      {col.kind === "metric"
                        ? formatMetric(row[col.key], col)
                        : (row[col.key] ?? (
                            <span className="text-muted-foreground">–</span>
                          ))}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <ResultChart
          result={result}
          dimension={dimensions[0]}
          metrics={metrics}
        />
      )}
    </div>
  );
}

function ViewButton({
  active,
  onClick,
  label,
  icon,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[5px] px-2.5 py-1 text-sm transition-colors disabled:opacity-40",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function ResultMeta({ result }: { result: QueryResult }) {
  const t = useTranslations("queryBuilderPage");
  return (
    <p className="text-muted-foreground font-mono text-xs">
      {t("metaRows", { count: result.meta.rowCount })}
      {" · "}
      {t("metaScrims", { count: result.meta.scrimCount })}
      {" · "}
      {t("metaDuration", { ms: result.meta.durationMs })}
      {result.meta.truncated && (
        <span className="text-primary">
          {" · "}
          {t("metaTruncated")}
        </span>
      )}
    </p>
  );
}

function ResultChart({
  result,
  dimension,
  metrics,
}: {
  result: QueryResult;
  dimension: ResultColumn;
  metrics: ResultColumn[];
}) {
  const t = useTranslations("queryBuilderPage");
  const isLine = TEMPORAL_DIMENSIONS.has(dimension.key);
  const data = result.rows.slice(0, MAX_CHART_ROWS).map((row) => ({
    ...row,
    __label: row[dimension.key] ?? "—",
  }));

  const config: ChartConfig = {};
  metrics.forEach((m, i) => {
    config[m.key] = { label: m.label, color: `var(--chart-${(i % 5) + 1})` };
  });

  const Chart = isLine ? LineChart : BarChart;

  return (
    <div className="border-border space-y-2 rounded-lg border p-4">
      <ChartContainer config={config} className="h-[340px] w-full">
        <Chart data={data} margin={{ left: 8, right: 8, top: 8 }}>
          <CartesianGrid vertical={false} className="stroke-border/50" />
          <XAxis
            dataKey="__label"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tick={{ fontSize: 11 }}
            interval="preserveStartEnd"
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={6}
            tick={{ fontSize: 11 }}
            width={44}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          {metrics.length > 1 && (
            <ChartLegend content={<ChartLegendContent />} />
          )}
          {metrics.map((m) =>
            isLine ? (
              <Line
                key={m.key}
                dataKey={m.key}
                stroke={`var(--color-${m.key})`}
                strokeWidth={2}
                dot={false}
              />
            ) : (
              <Bar
                key={m.key}
                dataKey={m.key}
                fill={`var(--color-${m.key})`}
                radius={[3, 3, 0, 0]}
              />
            )
          )}
        </Chart>
      </ChartContainer>
      {result.rows.length > MAX_CHART_ROWS && (
        <p className="text-muted-foreground text-center text-xs">
          {t("chartCapped", {
            shown: MAX_CHART_ROWS,
            total: result.rows.length,
          })}
        </p>
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-5 w-48" />
      <div className="border-border space-y-2 rounded-lg border p-4">
        {["a", "b", "c", "d", "e", "f"].map((id) => (
          <Skeleton key={id} className="h-8 w-full" />
        ))}
      </div>
    </div>
  );
}

function EmptyState({
  title,
  body,
  tone = "default",
}: {
  title: string;
  body: string;
  tone?: "default" | "error";
}) {
  return (
    <div
      className={cn(
        "border-border flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-16 text-center",
        tone === "error" && "border-destructive/30 bg-destructive/5"
      )}
    >
      <p
        className={cn(
          "text-base font-medium",
          tone === "error" ? "text-destructive" : "text-foreground"
        )}
      >
        {title}
      </p>
      <p className="text-muted-foreground mt-1 max-w-md text-sm">{body}</p>
    </div>
  );
}
