"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import type { ChartConfig } from "@/components/ui/chart";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { TeamUltStats } from "@/data/team/types";
import { toHero } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

type UltUsageOverviewCardProps = {
  ultStats: TeamUltStats;
};

function getChargeTimeRating(seconds: number): string {
  if (seconds <= 90) return "chargeTimeFast";
  if (seconds <= 120) return "chargeTimeAverage";
  return "chargeTimeSlow";
}

function getHoldTimeRating(seconds: number): string {
  if (seconds <= 20) return "holdTimeGood";
  if (seconds <= 40) return "holdTimeAverage";
  return "holdTimeSlow";
}

const HERO_IMAGE_SIZE = 24;
const Y_AXIS_WIDTH = 140;

function renderHeroTick(props: {
  x: number;
  y: number;
  payload: { value: string };
}) {
  const heroSlug = toHero(props.payload.value);

  return (
    <g transform={`translate(${props.x},${props.y})`}>
      <image
        x={-Y_AXIS_WIDTH}
        y={-HERO_IMAGE_SIZE / 2}
        width={HERO_IMAGE_SIZE}
        height={HERO_IMAGE_SIZE}
        href={`/heroes/${heroSlug}.png`}
        clipPath="inset(0% round 4px)"
      />
      <text
        x={-Y_AXIS_WIDTH + HERO_IMAGE_SIZE + 6}
        y={0}
        dy={4}
        textAnchor="start"
        className="text-xs"
        style={{ fill: "var(--color-muted-foreground)" }}
      >
        {props.payload.value}
      </text>
    </g>
  );
}

const chartConfig: ChartConfig = {
  count: {
    label: "Fight openings",
    color: "var(--chart-1)",
  },
};

export function UltUsageOverviewCard({ ultStats }: UltUsageOverviewCardProps) {
  const t = useTranslations("teamStatsPage.ultimatesTab.overview");

  if (ultStats.totalUltsUsed === 0) {
    return (
      <section className="space-y-4">
        <SectionHeader
          eyebrow="Ultimates · Usage overview"
          title={t("title")}
        />
        <p className="text-muted-foreground text-sm">{t("noData")}</p>
      </section>
    );
  }

  const heroChartData = ultStats.topFightOpeningHeroes.map((h) => ({
    hero: h.hero,
    count: h.count,
  }));
  const chartHeight = Math.max(200, heroChartData.length * 40);

  const tempoRows: { label: string; value: string; sub: string }[] = [];

  if (ultStats.avgChargeTime > 0) {
    tempoRows.push({
      label: t("avgChargeTime"),
      value: `${ultStats.avgChargeTime.toFixed(1)}s`,
      sub: t(getChargeTimeRating(ultStats.avgChargeTime)),
    });
  }

  if (ultStats.avgHoldTime > 0) {
    tempoRows.push({
      label: t("avgHoldTime"),
      value: `${ultStats.avgHoldTime.toFixed(1)}s`,
      sub: t(getHoldTimeRating(ultStats.avgHoldTime)),
    });
  }

  if (ultStats.totalFightsWithUlts > 0) {
    tempoRows.push({
      label: t("fightInitiation"),
      value: `${ultStats.fightInitiationRate.toFixed(1)}%`,
      sub: t("fightInitiationDetail", {
        count: ultStats.fightInitiationCount,
        total: ultStats.totalFightsWithUlts,
      }),
    });
  }

  return (
    <section className="space-y-6">
      <SectionHeader
        eyebrow="Ultimates · Usage overview"
        title={t("title")}
        description={t("description", { maps: ultStats.totalMaps })}
      />

      {tempoRows.length > 0 && (
        <div className="border-border overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
                <th className="px-4 py-2 text-left font-medium">Metric</th>
                <th className="px-4 py-2 text-right font-medium">Value</th>
                <th className="px-4 py-2 text-left font-medium">Read</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {tempoRows.map((row) => (
                <tr
                  key={row.label}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <td className="text-muted-foreground px-4 py-3">
                    {row.label}
                  </td>
                  <td className="text-foreground px-4 py-3 text-right font-mono font-semibold tabular-nums">
                    {row.value}
                  </td>
                  <td className="text-muted-foreground px-4 py-3">{row.sub}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {heroChartData.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
              Top fight openers
            </p>
            <p className="text-muted-foreground font-mono text-xs tabular-nums">
              {t.rich("topOpenersLabel", {
                span: (chunks) => (
                  <span className="text-foreground">{chunks}</span>
                ),
                top: ultStats.topFightOpeningHeroes[0]?.hero ?? "",
                count: ultStats.topFightOpeningHeroes[0]?.count ?? 0,
              })}
            </p>
          </div>
          <ChartContainer
            config={chartConfig}
            className="w-full"
            style={{ height: chartHeight }}
          >
            <BarChart
              accessibilityLayer
              data={heroChartData}
              layout="vertical"
              margin={{ left: 8, right: 16, top: 4, bottom: 4 }}
            >
              <CartesianGrid horizontal={false} />
              <YAxis
                dataKey="hero"
                type="category"
                tickLine={false}
                axisLine={false}
                width={Y_AXIS_WIDTH}
                tick={renderHeroTick}
              />
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(label: string) => label}
                  />
                }
              />
              <Bar
                dataKey="count"
                fill="var(--color-count)"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ChartContainer>
        </div>
      )}
    </section>
  );
}
