"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import type { ChartConfig } from "@/components/ui/chart";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { TeamHeroSwapStats } from "@/data/team/types";
import { useFormatter, useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

type SwapWinrateImpactCardProps = {
  swapStats: TeamHeroSwapStats;
};

type Bucket = {
  label: string;
  winrate: number;
  mapsLabel: string;
  wins: number;
  losses: number;
};

function MicroStats({
  entries,
  formatPercent,
}: {
  entries: Bucket[];
  formatPercent: (value: number) => string;
}) {
  const cols = entries.length <= 2 ? "grid-cols-2" : "grid-cols-3";
  return (
    <div
      className={`border-border grid divide-x divide-y divide-[var(--border)] border-y ${cols} lg:divide-y-0`}
    >
      {entries.map((entry) => (
        <div key={entry.label} className="flex flex-col gap-1 px-3 py-2">
          <p className="text-muted-foreground font-mono text-[10px] tracking-[0.18em] uppercase">
            {entry.label}
          </p>
          <p className="text-foreground font-mono text-lg leading-none font-semibold tabular-nums">
            {formatPercent(entry.winrate)}
          </p>
          <p className="text-muted-foreground text-[11px]">{entry.mapsLabel}</p>
        </div>
      ))}
    </div>
  );
}

export function SwapWinrateImpactCard({
  swapStats,
}: SwapWinrateImpactCardProps) {
  const t = useTranslations("teamStatsPage.swapsTab.winrate");
  const format = useFormatter();

  function formatPercent(value: number) {
    return format.number(value / 100, {
      maximumFractionDigits: 1,
      minimumFractionDigits: 1,
      style: "percent",
    });
  }

  const countChartConfig: ChartConfig = {
    winrate: {
      label: t("winRateLabel"),
      color: "var(--chart-1)",
    },
  };

  const timingChartConfig: ChartConfig = {
    winrate: {
      label: t("winRateLabel"),
      color: "var(--chart-3)",
    },
  };

  const hasCountData = swapStats.winrateBySwapCount.some(
    (b) => b.totalMaps > 0
  );
  const hasTimingData = swapStats.timingOutcomes.some((b) => b.totalMaps > 0);

  if (!hasCountData && !hasTimingData) {
    return (
      <section className="space-y-4">
        <SectionHeader eyebrow={t("eyebrow")} title={t("title")} />
        <p className="text-muted-foreground text-sm">{t("noData")}</p>
      </section>
    );
  }

  const countData: Bucket[] = swapStats.winrateBySwapCount
    .filter((b) => b.totalMaps > 0)
    .map((b) => ({
      label: b.label,
      winrate: Math.round(b.winrate * 10) / 10,
      mapsLabel: t("maps", { count: format.number(b.totalMaps) }),
      wins: b.wins,
      losses: b.losses,
    }));

  const timingData: Bucket[] = swapStats.timingOutcomes
    .filter((b) => b.totalMaps > 0)
    .map((b) => ({
      label: b.label,
      winrate: Math.round(b.winrate * 10) / 10,
      mapsLabel: t("maps", { count: format.number(b.totalMaps) }),
      wins: b.wins,
      losses: b.losses,
    }));

  return (
    <section className="space-y-4">
      <SectionHeader eyebrow={t("eyebrow")} title={t("title")} />
      <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
        {hasCountData && (
          <div className="space-y-3">
            <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
              {t("byCount")}
            </p>
            <ChartContainer
              config={countChartConfig}
              className="h-[200px] w-full"
            >
              <BarChart
                accessibilityLayer
                data={countData}
                margin={{ left: 8, right: 16, top: 8, bottom: 4 }}
              >
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  className="text-xs"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 100]}
                  tickFormatter={(v: number) => formatPercent(v)}
                  width={48}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(label: string) => label}
                      formatter={(value) => formatPercent(Number(value))}
                    />
                  }
                />
                <Bar
                  dataKey="winrate"
                  fill="var(--color-winrate)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
            <MicroStats entries={countData} formatPercent={formatPercent} />
          </div>
        )}

        {hasTimingData && (
          <div className="space-y-3">
            <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
              {t("byTiming")}
            </p>
            <ChartContainer
              config={timingChartConfig}
              className="h-[200px] w-full"
            >
              <BarChart
                accessibilityLayer
                data={timingData}
                margin={{ left: 8, right: 16, top: 8, bottom: 4 }}
              >
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  className="text-xs"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 100]}
                  tickFormatter={(v: number) => formatPercent(v)}
                  width={48}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(label: string) => label}
                      formatter={(value) => formatPercent(Number(value))}
                    />
                  }
                />
                <Bar
                  dataKey="winrate"
                  fill="var(--color-winrate)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
            <MicroStats entries={timingData} formatPercent={formatPercent} />
          </div>
        )}
      </div>
    </section>
  );
}
