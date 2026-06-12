"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { GameModeWinrateResult } from "@/lib/ranked-stats";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";

type GameModeWinrateChartProps = {
  result: GameModeWinrateResult;
};

const chartConfig = {
  winrate: {
    label: "Winrate",
  },
} satisfies ChartConfig;

export function GameModeWinrateChart({ result }: GameModeWinrateChartProps) {
  const { data, insight } = result;

  const description =
    insight.bestMode &&
    insight.worstMode &&
    insight.bestMode !== insight.worstMode
      ? `You dominate ${insight.bestMode} at ${insight.bestWinrate}% but struggle on ${insight.worstMode} at ${insight.worstWinrate}%`
      : insight.bestMode
        ? `${insight.bestMode} is your strongest mode at ${insight.bestWinrate}%`
        : "Play more matches to see mode winrates";

  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow="Game modes"
        title="Which modes suit you?"
        description={description}
      />
      <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 40, left: 0, bottom: 4 }}
          >
            <CartesianGrid horizontal={false} />
            <XAxis
              type="number"
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}%`}
            />
            <YAxis
              type="category"
              dataKey="mode"
              tickLine={false}
              axisLine={false}
              width={80}
              fontSize={12}
            />
            <ReferenceLine
              x={50}
              stroke="var(--color-muted-foreground)"
              strokeDasharray="3 3"
              strokeOpacity={0.5}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, _name, item) => {
                    const payload = item.payload as typeof data[number];
                    return (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Winrate</span>
                          <span className="font-mono font-medium tabular-nums">
                            {value}%
                          </span>
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {payload.wins}W / {payload.total} games
                        </div>
                      </div>
                    );
                  }}
                  hideIndicator
                />
              }
            />
            <Bar dataKey="winrate" radius={[0, 4, 4, 0]}>
              {data.map((entry) => (
                <Cell
                  key={entry.mode}
                  fill={
                    entry.winrate >= 50
                      ? "var(--chart-win)"
                      : "var(--chart-loss)"
                  }
                />
              ))}
            </Bar>
          </BarChart>
      </ChartContainer>
      <p className="text-muted-foreground text-xs">
        Dashed line marks 50% winrate
      </p>
    </section>
  );
}
