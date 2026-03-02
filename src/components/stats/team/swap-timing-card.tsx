"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChartConfig } from "@/components/ui/chart";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { TeamHeroSwapStats } from "@/data/team-hero-swap-dto";
import { useTranslations } from "next-intl";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

type SwapTimingCardProps = {
  swapStats: TeamHeroSwapStats;
};

const chartConfig: ChartConfig = {
  count: {
    label: "Swaps",
    color: "var(--chart-1)",
  },
};

export function SwapTimingCard({ swapStats }: SwapTimingCardProps) {
  const t = useTranslations("teamStatsPage.swapsTab.timing");

  if (swapStats.totalSwaps === 0 || swapStats.timingDistribution.length === 0) {
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

  const chartData = swapStats.timingDistribution.map((bucket) => ({
    bucket: bucket.bucket,
    count: bucket.count,
    percentage: bucket.percentage,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[280px] w-full">
          <AreaChart
            accessibilityLayer
            data={chartData}
            margin={{ left: 8, right: 16, top: 8, bottom: 4 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="bucket"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              className="text-xs"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              width={40}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(label: string) => `Match time: ${label}`}
                  formatter={(value) => {
                    const n = Number(value);
                    return `${n} swap${n !== 1 ? "s" : ""}`;
                  }}
                />
              }
            />
            <defs>
              <linearGradient id="swapTimingFill" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--chart-1)"
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor="var(--chart-1)"
                  stopOpacity={0.05}
                />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="count"
              stroke="var(--color-count)"
              strokeWidth={2}
              fill="url(#swapTimingFill)"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
