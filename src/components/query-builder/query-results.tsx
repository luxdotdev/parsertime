"use client";

import { SqlView } from "@/components/query-builder/compiled-query";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatMetric } from "@/lib/query-builder/format";
import type { QueryResult, ResultColumn } from "@/lib/query-builder/types";
import { cn } from "@/lib/utils";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  AreaChartIcon,
  BarChart3Icon,
  LineChartIcon,
  PieChartIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import type {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  type TooltipProps,
  XAxis,
  YAxis,
} from "recharts";

type Tab = "table" | "chart" | "sql";
type ChartType = "bar" | "line" | "area" | "donut";

const TEMPORAL_DIMENSIONS = new Set(["scrim", "date", "map"]);
const MAX_CHART_ROWS = 30;
const MAX_DONUT_SLICES = 12;

const tabTriggerClass =
  "text-muted-foreground hover:text-foreground data-[state=active]:text-foreground border-0 border-b-2 border-b-transparent data-[state=active]:border-b-primary rounded-none bg-transparent px-0 pb-2.5 pt-1 font-mono text-[11px] tracking-[0.16em] uppercase shadow-none data-[state=active]:shadow-none data-[state=active]:bg-transparent dark:bg-transparent dark:data-[state=active]:bg-transparent dark:data-[state=active]:border-b-primary transition-colors flex-none disabled:opacity-40";

export function QueryResults({
  status,
  result,
  error,
  sql,
  tables,
}: {
  status: "idle" | "loading" | "error" | "ready";
  result: QueryResult | null;
  error: string | null;
  sql: string | null;
  tables: string[];
}) {
  const t = useTranslations("queryBuilderPage");
  const [tab, setTab] = useState<Tab>("table");
  const [chartType, setChartType] = useState<ChartType | null>(null);
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(
    null
  );

  const dimensions = useMemo(
    () => result?.columns.filter((c) => c.kind === "dimension") ?? [],
    [result]
  );
  const metrics = useMemo(
    () => result?.columns.filter((c) => c.kind === "metric") ?? [],
    [result]
  );
  const hasResult = status === "ready" && result !== null;
  const canChart = hasResult && dimensions.length >= 1 && metrics.length >= 1;

  const dimension = dimensions[0];
  const isTemporal = dimension ? TEMPORAL_DIMENSIONS.has(dimension.key) : false;

  // A donut compares one metric across a handful of categories. We offer it for
  // any single non-negative numeric metric (pies can't represent negatives or
  // multiple series). What changes per metric is the *center* readout: a sum for
  // additive counts/totals, an average for rates and percentages — never a
  // blind sum of win rates that lands at 155%.
  const donutEligible = useMemo(() => {
    if (!canChart || metrics.length !== 1 || !result) return false;
    const rows = result.rows;
    if (rows.length < 2 || rows.length > MAX_DONUT_SLICES) return false;
    return rows.every((row) => {
      const v = row[metrics[0].key];
      return typeof v === "number" && v >= 0;
    });
  }, [canChart, metrics, result]);

  const availableTypes = useMemo<ChartType[]>(() => {
    if (!canChart) return [];
    const base: ChartType[] = ["bar", "line", "area"];
    return donutEligible ? [...base, "donut"] : base;
  }, [canChart, donutEligible]);

  const defaultType: ChartType = isTemporal ? "line" : "bar";
  const effectiveType: ChartType =
    chartType && availableTypes.includes(chartType) ? chartType : defaultType;

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

  // A re-run can turn a chartable result into a non-chartable one; don't strand
  // the user on a now-disabled Chart tab.
  useEffect(() => {
    if (tab === "chart" && !canChart) setTab("table");
  }, [tab, canChart]);

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
    <section aria-label={t("outputTitle")} className="space-y-4">
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <div className="border-border flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b">
          <TabsList className="h-auto justify-start gap-6 rounded-none bg-transparent p-0">
            <TabsTrigger value="table" className={tabTriggerClass}>
              {t("viewTable")}
            </TabsTrigger>
            <TabsTrigger
              value="chart"
              className={tabTriggerClass}
              disabled={!canChart}
            >
              {t("viewChart")}
            </TabsTrigger>
            <TabsTrigger value="sql" className={tabTriggerClass}>
              {t("viewSql")}
            </TabsTrigger>
          </TabsList>
          {hasResult && <ResultMeta result={result} />}
        </div>

        <TabsContent value="table" className="pt-2">
          <TablePanel
            status={status}
            result={result}
            error={error}
            sortedRows={sortedRows}
            sort={sort}
            onToggleSort={toggleSort}
          />
        </TabsContent>

        <TabsContent value="chart" className="pt-2">
          {canChart ? (
            <ChartPanel
              result={result}
              dimension={dimension}
              metrics={metrics}
              type={effectiveType}
              availableTypes={availableTypes}
              onTypeChange={setChartType}
            />
          ) : (
            <EmptyState title={t("emptyTitle")} body={t("emptyBody")} />
          )}
        </TabsContent>

        <TabsContent value="sql" className="pt-2">
          <SqlView sql={sql} tables={tables} />
        </TabsContent>
      </Tabs>
    </section>
  );
}

function TablePanel({
  status,
  result,
  error,
  sortedRows,
  sort,
  onToggleSort,
}: {
  status: "idle" | "loading" | "error" | "ready";
  result: QueryResult | null;
  error: string | null;
  sortedRows: QueryResult["rows"];
  sort: { key: string; dir: "asc" | "desc" } | null;
  onToggleSort: (key: string) => void;
}) {
  const t = useTranslations("queryBuilderPage");

  if (status === "loading") return <LoadingState />;
  if (status === "error")
    return (
      <EmptyState
        tone="error"
        title={t("errorTitle")}
        body={error ?? t("errorBody")}
      />
    );
  if (status === "idle" || !result)
    return <EmptyState title={t("emptyTitle")} body={t("emptyBody")} />;
  if (result.rows.length === 0)
    return <EmptyState title={t("zeroTitle")} body={t("zeroBody")} />;

  return (
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
                  onClick={() => onToggleSort(col.key)}
                  className={cn(
                    "hover:text-foreground inline-flex items-center gap-1 transition-colors",
                    col.kind === "metric" && "flex-row-reverse"
                  )}
                >
                  {col.label}
                  {sort?.key === col.key &&
                    (sort.dir === "desc" ? (
                      <ArrowDownIcon className="size-3" aria-hidden="true" />
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
  );
}

const CHART_TYPE_ICON: Record<
  ChartType,
  React.ComponentType<{ className?: string }>
> = {
  bar: BarChart3Icon,
  line: LineChartIcon,
  area: AreaChartIcon,
  donut: PieChartIcon,
};

function ChartTypePicker({
  value,
  available,
  onChange,
}: {
  value: ChartType;
  available: ChartType[];
  onChange: (type: ChartType) => void;
}) {
  const t = useTranslations("queryBuilderPage");
  const labels: Record<ChartType, string> = {
    bar: t("chartTypeBar"),
    line: t("chartTypeLine"),
    area: t("chartTypeArea"),
    donut: t("chartTypeDonut"),
  };
  return (
    <div
      role="group"
      aria-label={t("chartType")}
      className="border-border bg-muted/50 inline-flex rounded-md border p-0.5"
    >
      {available.map((type) => {
        const Icon = CHART_TYPE_ICON[type];
        const active = type === value;
        return (
          <button
            key={type}
            type="button"
            onClick={() => onChange(type)}
            aria-pressed={active}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-[5px] px-2.5 py-1 text-xs transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="size-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">{labels[type]}</span>
          </button>
        );
      })}
    </div>
  );
}

function ChartPanel({
  result,
  dimension,
  metrics,
  type,
  availableTypes,
  onTypeChange,
}: {
  result: QueryResult;
  dimension: ResultColumn;
  metrics: ResultColumn[];
  type: ChartType;
  availableTypes: ChartType[];
  onTypeChange: (type: ChartType) => void;
}) {
  const t = useTranslations("queryBuilderPage");

  return (
    <div className="border-border space-y-3 rounded-lg border p-4">
      <div className="flex justify-end">
        <ChartTypePicker
          value={type}
          available={availableTypes}
          onChange={onTypeChange}
        />
      </div>
      {type === "donut" ? (
        <DonutChart result={result} dimension={dimension} metric={metrics[0]} />
      ) : (
        <SeriesChart
          result={result}
          dimension={dimension}
          metrics={metrics}
          type={type}
        />
      )}
      {result.rows.length > MAX_CHART_ROWS && type !== "donut" && (
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

const ADDITIVE_AGGS = new Set(["sum", "count"]);
// Units whose values describe a rate or share, not a countable quantity, so a
// part-of-whole donut would lie about them.
const NON_ADDITIVE_UNITS = new Set(["%", "pp", "/10m"]);

function isAdditiveMetric(col: ResultColumn): boolean {
  // Result metric keys are `${agg}__${metric}` (see metricKey()), so the
  // aggregation is recoverable. Anything we can't confidently read as a sum or
  // count stays out of the donut.
  const agg = col.key.split("__")[0];
  if (!ADDITIVE_AGGS.has(agg)) return false;
  if (col.unit && NON_ADDITIVE_UNITS.has(col.unit)) return false;
  return true;
}

function chartColor(i: number): string {
  return `var(--chart-${(i % 5) + 1})`;
}

function formatAxisTick(value: number): string {
  if (!Number.isFinite(value)) return "";
  if (Math.abs(value) >= 1000)
    return value.toLocaleString(undefined, {
      notation: "compact",
      maximumFractionDigits: 1,
    });
  return value.toLocaleString(undefined, {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 1,
  });
}

function Swatch({ color }: { color: string }) {
  return (
    <span
      className="size-2 shrink-0 rounded-[2px]"
      style={{ backgroundColor: color }}
      aria-hidden="true"
    />
  );
}

function ChartLegend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 pt-1">
      {items.map((item) => (
        <span
          key={item.label}
          className="text-muted-foreground flex items-center gap-1.5 text-xs"
        >
          <Swatch color={item.color} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

function TooltipShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-popover text-popover-foreground border-border min-w-36 rounded-md border px-3 py-2 shadow-xl">
      {children}
    </div>
  );
}

function SeriesTooltip({
  active,
  payload,
  label,
  metrics,
}: TooltipProps<ValueType, NameType> & { metrics: ResultColumn[] }) {
  if (!active || !payload?.length) return null;
  const byKey = new Map(metrics.map((m) => [m.key, m]));
  return (
    <TooltipShell>
      <p className="mb-1.5 text-sm font-medium">{String(label)}</p>
      <div className="space-y-1">
        {payload.map((item) => {
          const col = byKey.get(String(item.dataKey));
          return (
            <div
              key={String(item.dataKey)}
              className="flex items-center justify-between gap-4 text-xs"
            >
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Swatch color={String(item.color)} />
                {col?.label ?? String(item.name)}
              </span>
              <span className="text-foreground font-mono tabular-nums">
                {col
                  ? formatMetric(item.value as number, col)
                  : String(item.value)}
              </span>
            </div>
          );
        })}
      </div>
    </TooltipShell>
  );
}

function DonutTooltip({
  active,
  payload,
  metric,
  total,
  showShare,
}: TooltipProps<ValueType, NameType> & {
  metric: ResultColumn;
  total: number;
  showShare: boolean;
}) {
  if (!active || !payload?.length) return null;
  const slice = payload[0].payload as {
    __label: string;
    value: number;
    fill: string;
  };
  // Share-of-total only means something when the slices add up to a real whole.
  // For rates and averages it would be a share of a meaningless sum, so skip it.
  const share = showShare && total > 0 ? (slice.value / total) * 100 : null;
  return (
    <TooltipShell>
      <div className="flex items-center justify-between gap-4 text-xs">
        <span className="text-muted-foreground flex items-center gap-1.5">
          <Swatch color={slice.fill} />
          {slice.__label}
        </span>
        <span className="text-foreground font-mono tabular-nums">
          {formatMetric(slice.value, metric)}
          {share !== null && (
            <span className="text-muted-foreground ml-1.5">
              {share.toFixed(0)}%
            </span>
          )}
        </span>
      </div>
    </TooltipShell>
  );
}

function SeriesChart({
  result,
  dimension,
  metrics,
  type,
}: {
  result: QueryResult;
  dimension: ResultColumn;
  metrics: ResultColumn[];
  type: Exclude<ChartType, "donut">;
}) {
  const data = result.rows.slice(0, MAX_CHART_ROWS).map((row) => ({
    ...row,
    __label: row[dimension.key] ?? "—",
  }));
  const margin = { left: 4, right: 12, top: 8, bottom: 4 };
  const tickFill = "var(--muted-foreground)";

  // These must be an array, not a fragment: recharts finds its typed children
  // (grid, axes, tooltip) by walking props.children with React.Children, which
  // flattens arrays but does NOT descend into a <Fragment>. Wrapping them in a
  // fragment hides them, so axis ticks and the tooltip silently never render.
  const axes = [
    <CartesianGrid
      key="grid"
      vertical={false}
      stroke="var(--border)"
      strokeOpacity={0.5}
    />,
    <XAxis
      key="x"
      dataKey="__label"
      tickLine={false}
      axisLine={false}
      tickMargin={8}
      minTickGap={16}
      tick={{ fill: tickFill, fontSize: 11 }}
      interval={data.length <= 12 ? 0 : "preserveStartEnd"}
    />,
    <YAxis
      key="y"
      tickLine={false}
      axisLine={false}
      tickMargin={6}
      width={48}
      tick={{ fill: tickFill, fontSize: 11 }}
      tickFormatter={(value) => formatAxisTick(Number(value))}
    />,
    <Tooltip
      key="tip"
      cursor={{ stroke: "var(--border)", fill: "var(--muted)" }}
      content={<SeriesTooltip metrics={metrics} />}
    />,
  ];

  return (
    <>
      <ResponsiveContainer width="100%" height={340}>
        {type === "line" ? (
          <LineChart data={data} margin={margin}>
            {axes}
            {metrics.map((m, i) => (
              <Line
                key={m.key}
                dataKey={m.key}
                name={m.label}
                stroke={chartColor(i)}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        ) : type === "area" ? (
          <AreaChart data={data} margin={margin}>
            <defs>
              {metrics.map((m, i) => (
                <linearGradient
                  key={m.key}
                  id={`qb-fill-${i}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={chartColor(i)}
                    stopOpacity={0.35}
                  />
                  <stop
                    offset="95%"
                    stopColor={chartColor(i)}
                    stopOpacity={0.04}
                  />
                </linearGradient>
              ))}
            </defs>
            {axes}
            {metrics.map((m, i) => (
              <Area
                key={m.key}
                dataKey={m.key}
                name={m.label}
                stroke={chartColor(i)}
                strokeWidth={2}
                fill={`url(#qb-fill-${i})`}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </AreaChart>
        ) : (
          <BarChart data={data} margin={margin}>
            {axes}
            {metrics.map((m, i) => (
              <Bar
                key={m.key}
                dataKey={m.key}
                name={m.label}
                fill={chartColor(i)}
                radius={[3, 3, 0, 0]}
              />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
      {metrics.length > 1 && (
        <ChartLegend
          items={metrics.map((m, i) => ({
            label: m.label,
            color: chartColor(i),
          }))}
        />
      )}
    </>
  );
}

function DonutChart({
  result,
  dimension,
  metric,
}: {
  result: QueryResult;
  dimension: ResultColumn;
  metric: ResultColumn;
}) {
  const data = result.rows.map((row, i) => ({
    __label: String(row[dimension.key] ?? "—"),
    value: Number(row[metric.key] ?? 0),
    fill: chartColor(i),
  }));
  const sum = data.reduce((acc, d) => acc + d.value, 0);
  // Additive metrics get a true total in the hole; rates and averages get the
  // mean of the slices instead, so the center never reads as a >100% sum.
  const additive = isAdditiveMetric(metric);
  const centerValue = additive ? sum : data.length ? sum / data.length : 0;

  return (
    <>
      <ResponsiveContainer width="100%" height={340}>
        <PieChart>
          <Tooltip
            content={
              <DonutTooltip metric={metric} total={sum} showShare={additive} />
            }
          />
          <Pie
            data={data}
            dataKey="value"
            nameKey="__label"
            innerRadius={78}
            outerRadius={120}
            paddingAngle={2}
            strokeWidth={2}
            stroke="var(--background)"
          >
            {data.map((d) => (
              <Cell key={d.__label} fill={d.fill} />
            ))}
            <Label
              content={({ viewBox }) => {
                if (!viewBox || !("cx" in viewBox)) return null;
                return (
                  <text
                    x={viewBox.cx}
                    y={viewBox.cy}
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    <tspan
                      x={viewBox.cx}
                      y={viewBox.cy}
                      className="fill-foreground font-mono text-2xl font-semibold tabular-nums"
                    >
                      {formatMetric(centerValue, metric)}
                    </tspan>
                    <tspan
                      x={viewBox.cx}
                      y={(viewBox.cy ?? 0) + 22}
                      className="fill-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase"
                    >
                      {metric.label}
                    </tspan>
                  </text>
                );
              }}
            />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <ChartLegend
        items={data.map((d) => ({ label: d.__label, color: d.fill }))}
      />
    </>
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

function LoadingState() {
  return (
    <div className="border-border space-y-2 rounded-lg border p-4">
      {["a", "b", "c", "d", "e", "f"].map((id) => (
        <Skeleton key={id} className="h-8 w-full" />
      ))}
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
