"use client";

import { OpponentComparisonCard } from "@/components/stats/team/opponent-comparison-card";
import { SectionHeader } from "@/components/stats/team/section-header";
import type { ChartConfig } from "@/components/ui/chart";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { useTempoReadLabel } from "@/components/stats/team/use-tempo-read-label";
import type { TeamUltStats } from "@/data/team/types";
import type { TempoBaselineStat } from "@/lib/tempo/classify";
import type { OpponentTempoComparison } from "@/lib/tempo/opponent-benchmark";
import { toHero } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

type UltUsageOverviewCardProps = {
  ultStats: TeamUltStats;
  chargeBaseline?: TempoBaselineStat | null;
  holdBaseline?: TempoBaselineStat | null;
};

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

export function UltUsageOverviewCard({
  ultStats,
  chargeBaseline,
  holdBaseline,
}: UltUsageOverviewCardProps) {
  const t = useTranslations("teamStatsPage.ultimatesTab.overview");
  const tempoLabel = useTempoReadLabel();
  const chartConfig: ChartConfig = {
    count: {
      label: t("fightOpenings"),
      color: "var(--chart-1)",
    },
  };

  if (ultStats.totalUltsUsed === 0) {
    return (
      <section className="space-y-4">
        <SectionHeader eyebrow={t("eyebrow")} title={t("title")} />
        <p className="text-muted-foreground text-sm">{t("noData")}</p>
      </section>
    );
  }

  const heroChartData = ultStats.topFightOpeningHeroes.map((h) => ({
    hero: h.hero,
    count: h.count,
  }));
  const chartHeight = Math.max(200, heroChartData.length * 40);

  const tempoRows: {
    label: string;
    value: string;
    sub: string;
    opponent?: OpponentTempoComparison | null;
  }[] = [];

  if (ultStats.avgChargeTime > 0) {
    tempoRows.push({
      label: t("avgChargeTime"),
      value: `${ultStats.avgChargeTime.toFixed(1)}s`,
      sub: tempoLabel(ultStats.avgChargeTime, chargeBaseline) ?? "—",
      opponent: ultStats.chargeTimeVsOpponents,
    });
  }

  if (ultStats.avgHoldTime > 0) {
    tempoRows.push({
      label: t("avgHoldTime"),
      value: `${ultStats.avgHoldTime.toFixed(1)}s`,
      sub: tempoLabel(ultStats.avgHoldTime, holdBaseline) ?? "—",
      opponent: ultStats.holdTimeVsOpponents,
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
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description", { maps: ultStats.totalMaps })}
      />

      {tempoRows.length > 0 && (
        <div className="border-border overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
                <th className="px-4 py-2 text-left font-medium">
                  {t("metric")}
                </th>
                <th className="px-4 py-2 text-right font-medium">
                  {t("value")}
                </th>
                <th className="px-4 py-2 text-left font-medium">{t("read")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {tempoRows.map((row) => {
                const cells = (
                  <>
                    <td className="text-muted-foreground px-4 py-3">
                      {row.label}
                    </td>
                    <td className="text-foreground px-4 py-3 text-right font-mono font-semibold tabular-nums">
                      {row.value}
                    </td>
                    <td className="text-muted-foreground px-4 py-3">
                      {row.sub}
                    </td>
                  </>
                );

                if (!row.opponent) {
                  return (
                    <tr
                      key={row.label}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      {cells}
                    </tr>
                  );
                }

                return (
                  <HoverCard key={row.label} openDelay={120} closeDelay={60}>
                    <HoverCardTrigger asChild>
                      <tr className="hover:bg-muted/30 cursor-help transition-colors">
                        {cells}
                      </tr>
                    </HoverCardTrigger>
                    <HoverCardContent align="start" className="w-96">
                      <OpponentComparisonCard
                        metricLabel={row.label}
                        comparison={row.opponent}
                      />
                    </HoverCardContent>
                  </HoverCard>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {heroChartData.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
              {t("topFightOpeners")}
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
