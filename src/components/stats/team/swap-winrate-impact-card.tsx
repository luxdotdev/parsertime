"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChartConfig } from "@/components/ui/chart";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { TeamHeroSwapStats } from "@/data/team-hero-swap-dto";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";

type SwapWinrateImpactCardProps = {
  swapStats: TeamHeroSwapStats;
};

function getBarColor(winrate: number): string {
  if (winrate >= 55) return "var(--chart-2)";
  if (winrate >= 45) return "var(--chart-1)";
  return "var(--chart-5)";
}

function getWinrateTextColor(winrate: number): string {
  if (winrate >= 55) return "text-green-600 dark:text-green-400";
  if (winrate >= 45) return "text-blue-600 dark:text-blue-400";
  return "text-red-600 dark:text-red-400";
}

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
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">{t("noData")}</p>
        </CardContent>
      </Card>
    );
  }

  const countData = swapStats.winrateBySwapCount
    .filter((b) => b.totalMaps > 0)
    .map((b) => ({
      label: b.label,
      winrate: Math.round(b.winrate * 10) / 10,
      maps: b.totalMaps,
      wins: b.wins,
      losses: b.losses,
    }));

  const timingData = swapStats.timingOutcomes
    .filter((b) => b.totalMaps > 0)
    .map((b) => ({
      label: b.label,
      winrate: Math.round(b.winrate * 10) / 10,
      maps: b.totalMaps,
      wins: b.wins,
      losses: b.losses,
    }));

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {hasCountData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("byCount")}</CardTitle>
            <p className="text-muted-foreground text-sm">
              {t("descriptionCount")}
            </p>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={countChartConfig}
              className="h-[240px] w-full"
            >
              <BarChart
                accessibilityLayer
                data={countData}
                margin={{ left: 8, right: 16, top: 8, bottom: 4 }}
              >
                <CartesianGrid vertical={false} />
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
                <Bar dataKey="winrate" radius={[4, 4, 0, 0]}>
                  {countData.map((entry) => (
                    <Cell key={entry.label} fill={getBarColor(entry.winrate)} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {countData.map((entry) => (
                <div
                  key={entry.label}
                  className="bg-muted rounded-md px-3 py-2"
                >
                  <p className="text-muted-foreground text-xs">{entry.label}</p>
                  <p
                    className={cn(
                      "text-lg font-semibold tabular-nums",
                      getWinrateTextColor(entry.winrate)
                    )}
                  >
                    {entry.winrate.toFixed(1)}%
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {t("maps", { count: entry.maps })}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {hasTimingData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("byTiming")}</CardTitle>
            <p className="text-muted-foreground text-sm">
              {t("descriptionTiming")}
            </p>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={timingChartConfig}
              className="h-[240px] w-full"
            >
              <BarChart
                accessibilityLayer
                data={timingData}
                margin={{ left: 8, right: 16, top: 8, bottom: 4 }}
              >
                <CartesianGrid vertical={false} />
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
                <Bar dataKey="winrate" radius={[4, 4, 0, 0]}>
                  {timingData.map((entry) => (
                    <Cell key={entry.label} fill={getBarColor(entry.winrate)} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {timingData.map((entry) => (
                <div
                  key={entry.label}
                  className="bg-muted rounded-md px-3 py-2"
                >
                  <p className="text-muted-foreground text-xs">{entry.label}</p>
                  <p
                    className={cn(
                      "text-lg font-semibold tabular-nums",
                      getWinrateTextColor(entry.winrate)
                    )}
                  >
                    {entry.winrate.toFixed(1)}%
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {t("maps", { count: entry.maps })}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
