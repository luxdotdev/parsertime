"use client";

import { TeamSwitcherContext } from "@/components/team-switcher-provider";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  AllOverview,
  DashboardOverview as OverviewData,
  OverviewScrimsPoint,
  OverviewWinratePoint,
  TeamOverview,
} from "@/lib/dashboard/overview";
import { cn } from "@/lib/utils";
import { dashboardOverviewStore } from "@/stores/dashboard-overview-store";
import { useSelector } from "@xstate/store/react";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { use, useEffect, useId, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  type TooltipProps,
  XAxis,
  YAxis,
} from "recharts";
import type {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";

type RibbonCell = {
  label: string;
  value: string;
  /** Line below the value (expanded view only). */
  sub?: ReactNode;
  /** Muted text inline after the value (expanded view only). */
  meta?: ReactNode;
  /** Colored trend chip beside the value (expanded view only). */
  delta?: { dir: "up" | "down"; text: string } | null;
  /** Smaller value type for text values (map names, dates). */
  valueAsText?: boolean;
};

function collapsedSelector(
  state: ReturnType<typeof dashboardOverviewStore.getSnapshot>
) {
  return state.context.collapsed;
}

export function DashboardOverview({ isAdmin = false }: { isAdmin?: boolean }) {
  const t = useTranslations("dashboard.activity");
  const prefersReducedMotion = useReducedMotion();
  const { teamId } = use(TeamSwitcherContext);
  const effectiveTeamId = isAdmin ? undefined : teamId;
  const panelId = useId();

  // Gate the persisted collapsed state behind mount so SSR and first client
  // render agree (both show the skeleton); the persisted value lands with the
  // first data render, which only happens client-side after the fetch.
  const collapsedPref = useSelector(dashboardOverviewStore, collapsedSelector);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const collapsed = mounted && collapsedPref;

  const { data, isLoading, isError } = useQuery<OverviewData, Error>({
    queryKey: isAdmin
      ? ["dashboard-overview", "admin"]
      : ["dashboard-overview", effectiveTeamId ?? "all"],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (isAdmin) params.set("adminMode", "true");
      else if (effectiveTeamId) params.set("teamId", String(effectiveTeamId));
      const res = await fetch(`/api/dashboard/overview?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load overview");
      return (await res.json()) as OverviewData;
    },
    staleTime: 60_000,
  });

  // Stay out of the way on failure — the scrim list below is the primary surface.
  if (isError) return null;

  function toggle() {
    dashboardOverviewStore.send({ type: "toggleCollapsed" });
  }

  return (
    <motion.section
      aria-label={t("regionLabel")}
      className="mb-6"
      initial={prefersReducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] }}
    >
      {isLoading || !data ? (
        <OverviewSkeleton collapsed={collapsed} />
      ) : (
        <Band
          data={data}
          t={t}
          collapsed={collapsed}
          onToggle={toggle}
          panelId={panelId}
        />
      )}
    </motion.section>
  );
}

type T = ReturnType<typeof useTranslations>;

function Band({
  data,
  t,
  collapsed,
  onToggle,
  panelId,
}: {
  data: OverviewData;
  t: T;
  collapsed: boolean;
  onToggle: () => void;
  panelId: string;
}) {
  const format = useFormatter();
  const cells =
    data.mode === "team"
      ? teamCells(data, format, t)
      : allCells(data, format, t);

  return (
    <div>
      <div className="border-border flex items-stretch border-y">
        <dl className="grid flex-1 grid-cols-2 divide-x divide-y divide-[var(--border)] lg:grid-cols-4 lg:divide-y-0">
          {cells.map((cell) =>
            collapsed ? (
              <CompactCell key={cell.label} cell={cell} />
            ) : (
              <FullCell key={cell.label} cell={cell} />
            )
          )}
        </dl>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!collapsed}
          aria-controls={panelId}
          aria-label={collapsed ? t("expand") : t("collapse")}
          className="border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground flex w-9 shrink-0 items-center justify-center border-l transition-colors"
        >
          {collapsed ? (
            <ChevronDownIcon className="size-4" aria-hidden="true" />
          ) : (
            <ChevronUpIcon className="size-4" aria-hidden="true" />
          )}
        </button>
      </div>

      {!collapsed ? (
        <div id={panelId}>
          {data.mode === "team" ? (
            <TrendChart
              eyebrow={t("trendEyebrowTeam")}
              summary={teamTrendSummary(data.series, format, t)}
              series={data.series}
              kind="winrate"
              t={t}
            />
          ) : (
            <TrendChart
              eyebrow={t("trendEyebrowAll")}
              summary={allTrendSummary(data.series, format, t)}
              series={data.series}
              kind="scrims"
              t={t}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}

function teamCells(
  data: TeamOverview,
  format: ReturnType<typeof useFormatter>,
  t: T
): RibbonCell[] {
  const { winrate, mapsLogged, teamTsr, bestMap } = data;
  const delta =
    winrate.delta !== null && Math.abs(winrate.delta) >= 0.5
      ? {
          dir: winrate.delta > 0 ? ("up" as const) : ("down" as const),
          text: format.number(Math.abs(Math.round(winrate.delta))),
        }
      : null;

  return [
    {
      label: t("winRate"),
      value: formatPercent(format, winrate.value),
      delta,
      sub: t("record", { wins: winrate.wins, losses: winrate.losses }),
    },
    { label: t("mapsLogged"), value: format.number(mapsLogged) },
    {
      label: t("teamTsr"),
      value: teamTsr.value === null ? "—" : format.number(teamTsr.value),
      sub:
        teamTsr.value === null
          ? t("tsrNoData")
          : t("tsrRated", {
              rated: teamTsr.ratedCount,
              total: teamTsr.rosterSize,
              confidence: t(`confidence.${teamTsr.confidence}`),
            }),
    },
    {
      label: t("bestMap"),
      value: bestMap ? bestMap.mapName : "—",
      valueAsText: true,
      sub: bestMap
        ? t("bestMapSub", { winrate: formatPercent(format, bestMap.winrate) })
        : t("bestMapNone"),
    },
  ];
}

function allCells(
  data: AllOverview,
  format: ReturnType<typeof useFormatter>,
  t: T
): RibbonCell[] {
  const latest = data.latestScrim ? new Date(data.latestScrim) : null;
  return [
    { label: t("scrimsLogged"), value: format.number(data.scrimsLogged) },
    { label: t("mapsLogged"), value: format.number(data.mapsLogged) },
    { label: t("activeTeams"), value: format.number(data.activeTeams) },
    {
      label: t("latestScrim"),
      value: latest
        ? format.dateTime(latest, { month: "short", day: "numeric" })
        : "—",
      valueAsText: true,
      // Inline the relative time rather than spending a third line on it.
      meta: latest ? format.relativeTime(latest) : t("never"),
    },
  ];
}

function FullCell({ cell }: { cell: RibbonCell }) {
  return (
    <div className="flex flex-col gap-1 px-4 py-2.5">
      <dt className="text-muted-foreground font-mono text-[10px] tracking-[0.18em] uppercase">
        {cell.label}
      </dt>
      <dd className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
        <span
          className={cn(
            "text-foreground font-semibold tabular-nums",
            cell.valueAsText
              ? "max-w-full truncate text-lg"
              : "font-mono text-2xl leading-none"
          )}
          title={cell.valueAsText ? cell.value : undefined}
        >
          {cell.value}
        </span>
        {cell.delta ? (
          <span
            className={cn(
              "font-mono text-xs font-medium tabular-nums",
              cell.delta.dir === "up" ? "text-primary" : "text-destructive"
            )}
          >
            {cell.delta.dir === "up" ? "↑" : "↓"}
            {cell.delta.text}
          </span>
        ) : null}
        {cell.meta ? (
          <span className="text-muted-foreground text-xs">{cell.meta}</span>
        ) : null}
      </dd>
      {cell.sub ? (
        <dd className="text-muted-foreground text-xs">{cell.sub}</dd>
      ) : null}
    </div>
  );
}

function CompactCell({ cell }: { cell: RibbonCell }) {
  return (
    <div className="flex items-baseline justify-between gap-2 px-4 py-2">
      <dt className="text-muted-foreground font-mono text-[10px] tracking-[0.18em] uppercase">
        {cell.label}
      </dt>
      <dd
        className="text-foreground truncate font-mono text-sm font-semibold tabular-nums"
        title={cell.value}
      >
        {cell.value}
      </dd>
    </div>
  );
}

type TrendKind = "winrate" | "scrims";

function TrendChart({
  eyebrow,
  summary,
  series,
  kind,
  t,
}: {
  eyebrow: string;
  summary: ReactNode;
  series: OverviewWinratePoint[] | OverviewScrimsPoint[];
  kind: TrendKind;
  t: T;
}) {
  const gradientId = `overview-trend-${kind}`;
  const dataKey = kind === "winrate" ? "winrate" : "scrims";
  const hasHistory = series.length >= 2;

  return (
    <section className="mt-4">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h3 className="text-muted-foreground font-mono text-[10px] tracking-[0.18em] uppercase">
          {eyebrow}
        </h3>
        <span className="text-muted-foreground text-xs tabular-nums">
          {summary}
        </span>
      </div>
      {hasHistory ? (
        <ResponsiveContainer width="100%" height={124}>
          <AreaChart
            data={series}
            margin={{ top: 6, right: 4, left: 4, bottom: 0 }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--primary)"
                  stopOpacity={0.28}
                />
                <stop
                  offset="100%"
                  stopColor="var(--primary)"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              stroke="var(--border)"
              strokeOpacity={0.5}
            />
            {kind === "winrate" ? (
              <ReferenceLine
                y={50}
                stroke="var(--muted-foreground)"
                strokeDasharray="4 4"
                strokeOpacity={0.5}
              />
            ) : null}
            <XAxis
              dataKey="period"
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={28}
              tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
            />
            <YAxis
              hide
              domain={kind === "winrate" ? [0, 100] : [0, "dataMax"]}
            />
            <Tooltip
              cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
              content={<TrendTooltip kind={kind} t={t} />}
            />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke="var(--primary)"
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              isAnimationActive={false}
              dot={false}
              activeDot={{ r: 3, fill: "var(--primary)" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="border-border flex h-[124px] items-center justify-center border-y border-dashed">
          <p className="text-muted-foreground text-xs">{t("noHistory")}</p>
        </div>
      )}
    </section>
  );
}

function TrendTooltip({
  active,
  payload,
  label,
  kind,
  t,
}: TooltipProps<ValueType, NameType> & { kind: TrendKind; t: T }) {
  const format = useFormatter();
  if (!active || !payload?.length) return null;

  const point = payload[0].payload as OverviewWinratePoint & OverviewScrimsPoint;

  return (
    <div className="bg-popover text-popover-foreground border-border z-50 overflow-hidden rounded-md border px-3 py-2 shadow-xl">
      <p className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
        {label}
      </p>
      {kind === "winrate" ? (
        <>
          <p className="text-sm font-semibold tabular-nums">
            {formatPercent(format, point.winrate)}
          </p>
          <p className="text-muted-foreground text-xs tabular-nums">
            {t("winsLosses", { wins: point.wins, losses: point.losses })}
          </p>
        </>
      ) : (
        <p className="text-sm font-semibold tabular-nums">
          {t("scrimsCount", { count: point.scrims })}
        </p>
      )}
    </div>
  );
}

const SKELETON_KEYS = ["a", "b", "c", "d"];

function OverviewSkeleton({ collapsed }: { collapsed: boolean }) {
  return (
    <div>
      <div className="border-border flex items-stretch border-y">
        <div className="grid flex-1 grid-cols-2 divide-x divide-y divide-[var(--border)] lg:grid-cols-4 lg:divide-y-0">
          {SKELETON_KEYS.map((key) =>
            collapsed ? (
              <div
                key={key}
                className="flex items-center justify-between gap-2 px-4 py-2"
              >
                <Skeleton className="h-2.5 w-14" />
                <Skeleton className="h-3.5 w-10" />
              </div>
            ) : (
              <div key={key} className="flex flex-col gap-2 px-4 py-2.5">
                <Skeleton className="h-2.5 w-16" />
                <Skeleton className="h-7 w-20" />
                <Skeleton className="h-3 w-24" />
              </div>
            )
          )}
        </div>
        <div className="border-border w-9 shrink-0 border-l" />
      </div>
      {!collapsed ? (
        <div className="mt-4">
          <div className="mb-2 flex items-baseline justify-between">
            <Skeleton className="h-2.5 w-32" />
            <Skeleton className="h-2.5 w-16" />
          </div>
          <Skeleton className="h-[124px] w-full" />
        </div>
      ) : null}
    </div>
  );
}

function formatPercent(
  format: ReturnType<typeof useFormatter>,
  value: number
): string {
  return format.number(value / 100, {
    style: "percent",
    maximumFractionDigits: 0,
  });
}

function teamTrendSummary(
  series: OverviewWinratePoint[],
  format: ReturnType<typeof useFormatter>,
  t: T
): ReactNode {
  if (series.length === 0) return null;
  const avg =
    series.reduce((sum, p) => sum + p.winrate, 0) / Math.max(series.length, 1);
  return t("avgWinrate", { winrate: formatPercent(format, avg) });
}

function allTrendSummary(
  series: OverviewScrimsPoint[],
  format: ReturnType<typeof useFormatter>,
  t: T
): ReactNode {
  if (series.length === 0) return null;
  const total = series.reduce((sum, p) => sum + p.scrims, 0);
  return t("totalScrims", {
    count: format.number(total),
    weeks: series.length,
  });
}
