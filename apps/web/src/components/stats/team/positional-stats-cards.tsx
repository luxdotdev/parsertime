"use client";

import { PositionalOutcomeBars } from "@/components/positional/positional-outcome-bars";
import { PositionalStatHeatmap } from "@/components/positional/positional-stat-heatmap";
import { ZoneControlByMap } from "@/components/positional/zone-control-by-map";
import { SectionHeader } from "@/components/stats/team/section-header";
import type { ChartConfig } from "@/components/ui/chart";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { TeamPositionalArtifacts } from "@/data/team/positional-artifacts-service";
import type { TeamPositionalStats } from "@/data/team/positional-stats-service";
import {
  POSITIONAL_STAT_FORMATTERS,
  POSITIONAL_STAT_KEYS,
  type PositionalStatKey,
} from "@/lib/positional-stat-display";
import { ChartBar } from "lucide-react";
import { useTranslations } from "next-intl";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

type TrendPoint = TeamPositionalStats["trends"][string][number];

const EM_DASH = "—";

function formatWinrate(winratePercent: number | null): string {
  return winratePercent === null ? EM_DASH : `${winratePercent.toFixed(1)}%`;
}

export function PositionalStatsEmpty() {
  const t = useTranslations("teamStatsPage.positional");

  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ChartBar />
        </EmptyMedia>
        <EmptyTitle>{t("title")}</EmptyTitle>
        <EmptyDescription>{t("empty")}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

function formatTrendDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function TrendSparkline({
  stat,
  series,
  label,
}: {
  stat: PositionalStatKey;
  series: TrendPoint[];
  label: string;
}) {
  const chartConfig: ChartConfig = {
    value: { label, color: "var(--chart-1)" },
  };
  const fillId = `trend-fill-${stat}`;

  return (
    <div className="bg-card flex flex-col gap-2 p-4">
      <p className="text-muted-foreground font-mono text-[0.6875rem] tracking-[0.06em] uppercase">
        {label}
      </p>
      <ChartContainer config={chartConfig} className="h-[120px] w-full">
        <AreaChart
          accessibilityLayer
          data={series}
          margin={{ left: 8, right: 16, top: 8, bottom: 4 }}
        >
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={16}
            tickFormatter={formatTrendDate}
            className="text-xs"
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={40}
            tickFormatter={(value: number) =>
              POSITIONAL_STAT_FORMATTERS[stat](Number(value))
            }
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(value) => formatTrendDate(String(value))}
                formatter={(value) =>
                  POSITIONAL_STAT_FORMATTERS[stat](Number(value))
                }
              />
            }
          />
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
              <stop
                offset="95%"
                stopColor="var(--chart-1)"
                stopOpacity={0.05}
              />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--color-value)"
            strokeWidth={2}
            fill={`url(#${fillId})`}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}

export function PositionalStatsCards({
  data,
  artifacts = null,
}: {
  data: TeamPositionalStats;
  artifacts?: TeamPositionalArtifacts | null;
}) {
  const t = useTranslations("teamStatsPage.positional");

  const trendStats = POSITIONAL_STAT_KEYS.filter(
    (stat) => (data.trends[stat]?.length ?? 0) > 0
  );

  const engagements = artifacts?.engagements ?? null;
  const showEngagements = engagements !== null && engagements.total > 0;
  const zonesByMap = artifacts?.zonesByMap ?? [];
  const routesByMap = artifacts?.routesByMap ?? [];

  const outcomeLabels = {
    won: t("wonLabel"),
    neutral: t("evenLabel"),
    lost: t("lostLabel"),
  };

  return (
    <div className="space-y-12">
      {/* Team-averages ribbon */}
      <section className="space-y-4">
        <SectionHeader
          eyebrow={t("eyebrow")}
          title={t("title")}
          description={t("description", { count: data.scrimWindow })}
        />
        <dl className="bg-border grid w-full grid-cols-2 gap-px overflow-hidden rounded-md sm:grid-cols-4">
          {POSITIONAL_STAT_KEYS.map((stat) => {
            const value = data.teamAverages[stat];
            return (
              <div key={stat} className="bg-card flex flex-col px-4 py-3">
                <dt className="text-muted-foreground font-mono text-[0.625rem] tracking-[0.06em] uppercase">
                  {t(`stats.${stat}.short`)}
                </dt>
                <dd className="mt-1 font-mono text-xl font-semibold tabular-nums">
                  {value === undefined
                    ? EM_DASH
                    : POSITIONAL_STAT_FORMATTERS[stat](value)}
                </dd>
              </div>
            );
          })}
        </dl>
      </section>

      {/* Per-stat trend sparklines */}
      {trendStats.length > 0 && (
        <section className="space-y-4">
          <SectionHeader eyebrow={t("eyebrow")} title={t("trendsTitle")} />
          <div className="bg-border grid w-full grid-cols-1 gap-px overflow-hidden rounded-md sm:grid-cols-2 lg:grid-cols-4">
            {trendStats.map((stat) => (
              <TrendSparkline
                key={stat}
                stat={stat}
                series={data.trends[stat]}
                label={t(`stats.${stat}.short`)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Per-player deviation heatmap */}
      <section className="space-y-4">
        <SectionHeader eyebrow={t("eyebrow")} title={t("playersTitle")} />
        <PositionalStatHeatmap
          players={data.players}
          playerLabel={t("playerColumn")}
          statLabel={(stat) => ({
            short: t(`stats.${stat}.short`),
            full: t(`stats.${stat}.full`),
          })}
          legend={{
            below: t("matrix.below"),
            above: t("matrix.above"),
            caption: t("matrix.legend"),
          }}
        />
      </section>

      {/* Engagement winrate */}
      {showEngagements && (
        <section className="space-y-4">
          <SectionHeader eyebrow={t("eyebrow")} title={t("engagementsTitle")} />
          <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
            <span className="text-foreground text-base font-semibold tabular-nums">
              {t("fights", { total: engagements.total })}
            </span>
            <span className="font-mono text-sm tabular-nums">
              {t("recordSummary", {
                won: engagements.won,
                lost: engagements.lost,
                even: engagements.even,
              })}
            </span>
            <span className="text-sm">
              <span className="text-muted-foreground">{t("winrate")}: </span>
              <span className="font-mono font-semibold tabular-nums">
                {formatWinrate(engagements.winratePercent)}
              </span>
            </span>
          </div>
          {engagements.byZone.length > 0 ? (
            <div className="space-y-2">
              <h4 className="text-muted-foreground font-mono text-xs tracking-[0.06em] uppercase">
                {t("byZoneTitle")}
              </h4>
              <PositionalOutcomeBars
                rows={engagements.byZone.map((zone) => ({
                  label: zone.zoneName,
                  won: zone.won,
                  lost: zone.lost,
                  neutral: zone.even,
                }))}
                labels={outcomeLabels}
              />
            </div>
          ) : (
            <PositionalOutcomeBars
              rows={[
                {
                  label: "",
                  won: engagements.won,
                  lost: engagements.lost,
                  neutral: engagements.even,
                },
              ]}
              labels={outcomeLabels}
              showLabels={false}
              showMeta={false}
            />
          )}
        </section>
      )}

      {/* Zone control by map */}
      {zonesByMap.length > 0 && (
        <section className="space-y-4">
          <SectionHeader eyebrow={t("eyebrow")} title={t("zonesTitle")} />
          <ZoneControlByMap
            zonesByMap={zonesByMap}
            ourTeamNames={artifacts?.ourTeamNames ?? []}
          />
        </section>
      )}

      {/* Routes by map */}
      {routesByMap.length > 0 && (
        <section className="space-y-4">
          <SectionHeader eyebrow={t("eyebrow")} title={t("routesTitle")} />
          <PositionalOutcomeBars
            rows={routesByMap.map((entry) => ({
              label: entry.mapName,
              won: entry.won,
              lost: entry.lost,
              neutral: Math.max(0, entry.total - entry.won - entry.lost),
            }))}
            labels={{
              won: t("wonLabel"),
              neutral: t("routesUndecided"),
              lost: t("lostLabel"),
            }}
          />
        </section>
      )}
    </div>
  );
}
