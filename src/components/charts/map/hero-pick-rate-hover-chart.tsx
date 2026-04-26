"use client";

import type { ChartConfig } from "@/components/ui/chart";
import { ChartContainer } from "@/components/ui/chart";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import type { MapHeroTrendPoint } from "@/data/map/hero-trends-service";
import { cn } from "@/lib/utils";
import {
  getPatchesInRange,
  type OverwatchPatch,
} from "@/types/overwatch-patches";
import * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  Tooltip,
  type TooltipProps,
  XAxis,
  YAxis,
} from "recharts";
import type {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";

type PatchType = OverwatchPatch["type"];

const PATCH_RANK: Record<PatchType, number> = {
  season: 0,
  "mid-season": 1,
  hotfix: 2,
};

const PATCH_STROKE: Record<PatchType, string> = {
  season: "var(--primary)",
  "mid-season": "color-mix(in oklch, var(--primary) 55%, transparent)",
  hotfix: "color-mix(in oklch, var(--muted-foreground) 60%, transparent)",
};

const PATCH_DASH: Record<PatchType, string> = {
  season: "0",
  "mid-season": "5 3",
  hotfix: "2 3",
};

const PATCH_WIDTH: Record<PatchType, number> = {
  season: 1.5,
  "mid-season": 1,
  hotfix: 1,
};

function shortSeasonLabel(name: string): string {
  const head = name.split(":")[0] ?? name;
  return head.replace("Season ", "S");
}

function formatBucketLabel(date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatPlaytime(seconds: number): string {
  if (seconds <= 0) return "0m";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
  return `${minutes}m`;
}

function formatPercent(value: number, digits = 0): string {
  return `${value.toFixed(digits)}%`;
}

function pickRateTrendDelta(trend: MapHeroTrendPoint[]): number {
  if (trend.length < 2) return 0;
  const midpoint = Math.floor(trend.length / 2);
  const earlySlice = trend.slice(0, midpoint);
  const lateSlice = trend.slice(midpoint);
  const earlyAvg =
    earlySlice.reduce((sum, p) => sum + p.pickRate, 0) / earlySlice.length;
  const lateAvg =
    lateSlice.reduce((sum, p) => sum + p.pickRate, 0) / lateSlice.length;
  return lateAvg - earlyAvg;
}

type ChartDatum = MapHeroTrendPoint & { label: string };

type ResolvedPatch = OverwatchPatch & { bucket: string; label: string };

function resolvePatches(
  trend: MapHeroTrendPoint[],
  patches: OverwatchPatch[]
): ResolvedPatch[] {
  const firstPoint = trend[0];
  if (!firstPoint) return [];
  const firstBucket = firstPoint.date;
  const byBucket = new Map<string, ResolvedPatch>();
  for (const patch of patches) {
    let bucket = firstBucket;
    for (const point of trend) {
      if (point.date <= patch.date) bucket = point.date;
      else break;
    }
    const existing = byBucket.get(bucket);
    if (!existing || PATCH_RANK[patch.type] < PATCH_RANK[existing.type]) {
      byBucket.set(bucket, {
        ...patch,
        bucket,
        label: formatBucketLabel(bucket),
      });
    }
  }
  return Array.from(byBucket.values());
}

function PickRateTooltip({
  active,
  payload,
  label,
}: TooltipProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null;
  const datum = payload[0]?.payload as ChartDatum | undefined;
  if (!datum) return null;
  return (
    <div className="bg-popover text-popover-foreground border-border rounded-md border px-2.5 py-1.5 shadow-md">
      <p className="text-muted-foreground font-mono text-[10px] tracking-[0.14em] uppercase">
        Week of {label}
      </p>
      <dl className="mt-1 space-y-0.5 text-xs">
        <div className="flex items-baseline justify-between gap-6">
          <dt className="text-muted-foreground">Pick rate</dt>
          <dd className="font-mono tabular-nums">
            {formatPercent(datum.pickRate, 1)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-6">
          <dt className="text-muted-foreground">Playtime</dt>
          <dd className="font-mono tabular-nums">
            {formatPlaytime(datum.playtime)}
          </dd>
        </div>
      </dl>
    </div>
  );
}

const chartConfig = {
  pickRate: { label: "Pick rate", color: "var(--primary)" },
} satisfies ChartConfig;

export function HeroPickRateHoverChart({
  heroLabel,
  subrole,
  trend,
  pickRate,
  children,
}: {
  heroLabel: string;
  subrole?: string | null;
  trend: MapHeroTrendPoint[];
  pickRate: number;
  children: React.ReactNode;
}) {
  const firstPoint = trend[0];
  const lastPoint = trend[trend.length - 1];
  if (trend.length < 2 || !firstPoint || !lastPoint) {
    return children;
  }

  const data: ChartDatum[] = trend.map((point) => ({
    ...point,
    label: formatBucketLabel(point.date),
  }));

  const patchPositions = resolvePatches(
    trend,
    getPatchesInRange(firstPoint.date, lastPoint.date)
  );

  const trendDelta = pickRateTrendDelta(trend);
  const trendUp = trendDelta > 0.5;
  const trendDown = trendDelta < -0.5;
  const trendGlyph = trendUp ? "↑" : trendDown ? "↓" : "·";
  const trendValue =
    Math.abs(trendDelta) < 0.1
      ? "—"
      : `${trendDelta >= 0 ? "+" : "-"}${Math.abs(trendDelta).toFixed(1)}pp`;

  const yMax = Math.max(...trend.map((p) => p.pickRate), 5);

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent
        className="w-[440px] p-0"
        side="right"
        align="start"
        sideOffset={12}
      >
        <header className="border-border flex items-end justify-between gap-6 border-b px-4 py-3">
          <div className="min-w-0">
            <p className="text-muted-foreground font-mono text-[10px] tracking-[0.18em] uppercase">
              Pick rate · Last 60 days
            </p>
            <p className="mt-1 truncate text-sm leading-tight font-medium">
              {heroLabel}
            </p>
            {subrole ? (
              <p className="text-muted-foreground mt-0.5 font-mono text-[10px] tracking-wider uppercase">
                {subrole}
              </p>
            ) : null}
          </div>
          <dl className="flex shrink-0 items-baseline gap-5 font-mono tabular-nums">
            <div className="text-right">
              <dt className="text-muted-foreground text-[10px] tracking-[0.14em] uppercase">
                Avg
              </dt>
              <dd className="text-sm">{formatPercent(pickRate, 1)}</dd>
            </div>
            <div className="text-right">
              <dt className="text-muted-foreground text-[10px] tracking-[0.14em] uppercase">
                Δ Window
              </dt>
              <dd
                className={cn(
                  "flex items-baseline justify-end gap-1 text-sm",
                  trendUp && "text-foreground",
                  (trendDown || (!trendUp && !trendDown)) &&
                    "text-muted-foreground"
                )}
              >
                <span aria-hidden className="text-[11px] leading-none">
                  {trendGlyph}
                </span>
                <span>{trendValue}</span>
              </dd>
            </div>
          </dl>
        </header>

        <div className="px-3 pt-3 pb-2">
          <ChartContainer config={chartConfig} className="h-[180px] w-full">
            <AreaChart
              data={data}
              margin={{ top: 14, right: 8, bottom: 0, left: 0 }}
            >
              <CartesianGrid
                stroke="var(--border)"
                strokeOpacity={0.6}
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                interval="preserveStartEnd"
                minTickGap={28}
                tick={{
                  fontSize: 10,
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.06em",
                  fill: "var(--muted-foreground)",
                }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: string) => value.toUpperCase()}
              />
              <YAxis
                tick={{
                  fontSize: 10,
                  fontFamily: "var(--font-mono)",
                  fill: "var(--muted-foreground)",
                }}
                tickLine={false}
                axisLine={false}
                width={36}
                domain={[0, Math.ceil(yMax * 1.1)]}
                tickFormatter={(value: number) => `${Math.round(value)}%`}
              />
              <Tooltip
                cursor={{
                  stroke: "var(--border)",
                  strokeWidth: 1,
                }}
                content={<PickRateTooltip />}
              />
              {patchPositions.map((patch) => (
                <ReferenceLine
                  key={`${patch.bucket}-${patch.name}`}
                  x={patch.label}
                  stroke={PATCH_STROKE[patch.type]}
                  strokeDasharray={PATCH_DASH[patch.type]}
                  strokeWidth={PATCH_WIDTH[patch.type]}
                  label={
                    patch.type === "season"
                      ? {
                          value: shortSeasonLabel(patch.name),
                          position: "top",
                          fill: "var(--primary)",
                          fontSize: 9,
                          fontFamily: "var(--font-mono)",
                          letterSpacing: "0.08em",
                        }
                      : undefined
                  }
                />
              ))}
              <Area
                type="monotone"
                dataKey="pickRate"
                stroke="var(--primary)"
                strokeWidth={1.75}
                fill="var(--primary)"
                fillOpacity={0.1}
                activeDot={{
                  r: 3,
                  fill: "var(--primary)",
                  stroke: "var(--popover)",
                  strokeWidth: 1.5,
                }}
              />
            </AreaChart>
          </ChartContainer>
        </div>

        {patchPositions.length > 0 ? (
          <footer className="border-border text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 border-t px-4 py-2 font-mono text-[10px] tracking-[0.14em] uppercase">
            <PatchLegendKey type="season" label="Season" />
            <PatchLegendKey type="mid-season" label="Mid-cycle" />
            <PatchLegendKey type="hotfix" label="Hotfix" />
          </footer>
        ) : null}
      </HoverCardContent>
    </HoverCard>
  );
}

function PatchLegendKey({ type, label }: { type: PatchType; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <svg width="14" height="6" aria-hidden="true">
        <line
          x1="0"
          y1="3"
          x2="14"
          y2="3"
          stroke={PATCH_STROKE[type]}
          strokeWidth={PATCH_WIDTH[type] + 0.25}
          strokeDasharray={PATCH_DASH[type]}
        />
      </svg>
      {label}
    </span>
  );
}
