"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { RollingWinrateEntry, RollingWinrateResult } from "@/lib/ranked-stats";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";

type WinrateTrendChartProps = {
  result: RollingWinrateResult;
};

const chartConfig = {
  rollingWinrate: {
    label: "Rolling Winrate",
    color: "var(--chart-win)",
  },
} satisfies ChartConfig;

function trendLabel(
  trend: "improving" | "declining" | "stable",
  current: number,
  peak: number,
  window: number
): string {
  if (trend === "improving")
    return `On the rise \u2014 your last ${window}-game average is ${current}%`;
  if (trend === "declining")
    return `Trending down \u2014 peaked at ${peak}%, currently ${current}%`;
  return `Holding steady around ${current}% over recent games`;
}

export function WinrateTrendChart({ result }: WinrateTrendChartProps) {
  const { data, insight } = result;

  if (data.length === 0) {
    return (
      <section className="space-y-4">
        <SectionHeader
          eyebrow="Trend"
          title="Are you improving?"
          description="Track more matches to see your trend"
        />
        <div className="flex h-[280px] items-center justify-center">
          <p className="text-muted-foreground text-sm">No data yet</p>
        </div>
      </section>
    );
  }

  const description = trendLabel(
    insight.trend,
    insight.currentWinrate,
    insight.peakWinrate,
    insight.window
  );

  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow="Trend"
        title="Are you improving?"
        description={description}
      />
      <ChartContainer config={chartConfig} className="h-[280px] w-full">
          <LineChart
            data={data}
            margin={{ top: 8, right: 8, left: -20, bottom: 4 }}
          >
            <defs>
              <linearGradient id="winrateGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-win)" stopOpacity={0.15} />
                <stop offset="100%" stopColor="var(--chart-win)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="gameIndex"
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `#${v}`}
              interval="preserveStartEnd"
              fontSize={12}
            />
            <YAxis
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}%`}
              fontSize={12}
            />
            <ReferenceLine
              y={50}
              stroke="var(--muted-foreground)"
              strokeDasharray="4 4"
              strokeOpacity={0.5}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, _name, item) => {
                    const payload = item.payload as RollingWinrateEntry;
                    return (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">
                            Rolling winrate
                          </span>
                          <span className="font-mono font-medium tabular-nums">
                            {value}%
                          </span>
                        </div>
                        <div className="text-muted-foreground text-xs">
                          Game #{payload.gameIndex} &middot; {payload.date}
                        </div>
                      </div>
                    );
                  }}
                  hideIndicator
                />
              }
            />
            <Line
              type="monotone"
              dataKey="rollingWinrate"
              stroke="var(--chart-win)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          </LineChart>
        </ChartContainer>
      <p className="text-muted-foreground text-xs">
        {insight.window}-game rolling average &middot; {data.length} games total
        &middot; peak {insight.peakWinrate}%
      </p>
    </section>
  );
}
