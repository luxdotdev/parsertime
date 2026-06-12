"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import { StatRibbon } from "@/components/stats/team/stat-ribbon";
import type {
  PatchTimelineResult,
  SeasonBreakdownEntry,
} from "@/lib/ranked-stats";
import type { OverwatchPatch, PatchType } from "@/types/overwatch-patches";
import { useTranslations } from "next-intl";
import {
  CartesianGrid,
  Line,
  LineChart,
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

type PatchImpactChartProps = {
  timeline: PatchTimelineResult;
  seasonBreakdown: SeasonBreakdownEntry[];
  patches: OverwatchPatch[];
};

const MARKER: Record<
  PatchType,
  { stroke: string; dash?: string; opacity: number }
> = {
  season: { stroke: "var(--primary)", opacity: 0.9 },
  "mid-season": {
    stroke: "var(--muted-foreground)",
    dash: "5 3",
    opacity: 0.8,
  },
  hotfix: {
    stroke: "var(--muted-foreground)",
    dash: "1 4",
    opacity: 0.55,
  },
};

function patchMs(date: string): number {
  return new Date(`${date}T00:00:00Z`).getTime();
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function TimelineTooltip({
  active,
  payload,
}: TooltipProps<ValueType, NameType>) {
  const t = useTranslations("ranked.charts.patchImpact");
  if (!active || !payload?.length) return null;
  const point = payload[0].payload as { ts: number; rollingWinrate: number };
  return (
    <div className="bg-popover text-popover-foreground border-border rounded-md border px-3 py-2 shadow-xl">
      <p className="text-xs font-semibold">{formatDate(point.ts)}</p>
      <p className="font-mono text-sm tabular-nums">
        {t("tooltipWinrate", { winrate: point.rollingWinrate })}
      </p>
    </div>
  );
}

export function PatchImpactChart({
  timeline,
  seasonBreakdown,
  patches,
}: PatchImpactChartProps) {
  const t = useTranslations("ranked.charts.patchImpact");
  const { data, minTs, maxTs } = timeline;

  const visiblePatches = patches.filter((p) => {
    const ts = patchMs(p.date);
    return ts >= minTs && ts <= maxTs;
  });

  const usedTypes = Array.from(new Set(visiblePatches.map((p) => p.type)));

  const ribbonColumns = (Math.min(
    Math.max(seasonBreakdown.length, 3),
    6
  ) ?? 3) as 3 | 4 | 5 | 6;

  return (
    <>
      {seasonBreakdown.length > 0 ? (
        <section className="space-y-4">
          <SectionHeader
            eyebrow={t("seasonsEyebrow")}
            title={t("seasonsTitle")}
            description={t("seasonsDescription")}
          />
          <StatRibbon
            columns={ribbonColumns}
            cells={seasonBreakdown.map((s, i) => ({
              label: s.name,
              value: `${s.winrate}%`,
              sub: t("seasonRecord", {
                wins: s.wins,
                losses: s.losses,
                games: s.games,
              }),
              emphasis: i === 0,
            }))}
          />
        </section>
      ) : null}

      <section className="space-y-4">
        <SectionHeader
          eyebrow={t("eyebrow")}
          title={t("title")}
          description={t("description")}
        />
        {data.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            {t("empty")}
          </p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart
                data={data}
                margin={{ top: 16, right: 12, left: -8, bottom: 4 }}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="var(--border)"
                  strokeOpacity={0.4}
                />
                <XAxis
                  dataKey="ts"
                  type="number"
                  scale="time"
                  domain={[minTs, maxTs]}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  tickFormatter={(v) => formatDate(Number(v))}
                  minTickGap={48}
                />
                <YAxis
                  domain={[0, 100]}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  content={<TimelineTooltip />}
                  cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1 }}
                />
                <ReferenceLine
                  y={50}
                  stroke="var(--muted-foreground)"
                  strokeDasharray="4 4"
                  strokeOpacity={0.5}
                />
                {visiblePatches.map((patch) => {
                  const style = MARKER[patch.type];
                  return (
                    <ReferenceLine
                      key={`${patch.date}-${patch.name}`}
                      x={patchMs(patch.date)}
                      stroke={style.stroke}
                      strokeDasharray={style.dash}
                      strokeOpacity={style.opacity}
                      label={
                        patch.type === "season"
                          ? {
                              value: patch.name,
                              position: "insideTopLeft",
                              fill: "var(--primary)",
                              fontSize: 10,
                            }
                          : undefined
                      }
                    />
                  );
                })}
                <Line
                  type="monotone"
                  dataKey="rollingWinrate"
                  stroke="var(--chart-win)"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
            {usedTypes.length > 0 ? (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                {usedTypes.map((type) => {
                  const style = MARKER[type];
                  const legendKey =
                    type === "mid-season" ? "legendMidSeason" : type === "hotfix" ? "legendHotfix" : "legendSeason";
                  return (
                    <span
                      key={type}
                      className="text-muted-foreground flex items-center gap-1.5 font-mono text-[10px] tracking-[0.12em] uppercase"
                    >
                      <span
                        className="inline-block h-3 w-0.5"
                        style={{
                          backgroundColor: style.stroke,
                          opacity: style.opacity,
                        }}
                        aria-hidden="true"
                      />
                      {t(legendKey)}
                    </span>
                  );
                })}
              </div>
            ) : null}
          </>
        )}
      </section>
    </>
  );
}
