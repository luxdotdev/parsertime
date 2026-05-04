"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import type { ChartConfig } from "@/components/ui/chart";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { TeamHeroSwapStats } from "@/data/team/types";
import { useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

type SwapWinrateImpactCardProps = {
  swapStats: TeamHeroSwapStats;
};

const countChartConfig: ChartConfig = {
  winrate: {
    label: "Win Rate",
    color: "var(--chart-1)",
  },
};

const timingChartConfig: ChartConfig = {
  winrate: {
    label: "Win Rate",
    color: "var(--chart-3)",
  },
};

type Bucket = {
  label: string;
  winrate: number;
  maps: number;
  wins: number;
  losses: number;
};

function MicroStats({ entries }: { entries: Bucket[] }) {
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
            {entry.winrate.toFixed(1)}%
          </p>
          <p className="text-muted-foreground text-[11px]">{entry.maps} maps</p>
        </div>
      ))}
    </div>
  );
}

export function SwapWinrateImpactCard({
  swapStats,
}: SwapWinrateImpactCardProps) {
  const t = useTranslations("teamStatsPage.swapsTab.winrate");

  const hasCountData = swapStats.winrateBySwapCount.some(
    (b) => b.totalMaps > 0
  );
  const hasTimingData = swapStats.timingOutcomes.some((b) => b.totalMaps > 0);

  if (!hasCountData && !hasTimingData) {
    return (
      <section className="space-y-4">
        <SectionHeader eyebrow="Swaps · Winrate impact" title={t("title")} />
        <p className="text-muted-foreground text-sm">{t("noData")}</p>
      </section>
    );
  }

  const countData: Bucket[] = swapStats.winrateBySwapCount
    .filter((b) => b.totalMaps > 0)
    .map((b) => ({
      label: b.label,
      winrate: Math.round(b.winrate * 10) / 10,
      maps: b.totalMaps,
      wins: b.wins,
      losses: b.losses,
    }));

  const timingData: Bucket[] = swapStats.timingOutcomes
    .filter((b) => b.totalMaps > 0)
    .map((b) => ({
      label: b.label,
      winrate: Math.round(b.winrate * 10) / 10,
      maps: b.totalMaps,
      wins: b.wins,
      losses: b.losses,
    }));

  return (
    <section className="space-y-4">
      <SectionHeader eyebrow="Swaps · Winrate impact" title={t("title")} />
      <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
        {hasCountData && (
          <div className="space-y-3">
            <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
              By count
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
                  tickFormatter={(v: number) => `${v}%`}
                  width={48}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(label: string) => label}
                      formatter={(value) => `${Number(value)}%`}
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
            <MicroStats entries={countData} />
          </div>
        )}

        {hasTimingData && (
          <div className="space-y-3">
            <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
              By timing
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
                  tickFormatter={(v: number) => `${v}%`}
                  width={48}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(label: string) => label}
                      formatter={(value) => `${Number(value)}%`}
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
            <MicroStats entries={timingData} />
          </div>
        )}
      </div>
    </section>
  );
}
