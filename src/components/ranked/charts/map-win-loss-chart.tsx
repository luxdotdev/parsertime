"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { MapWinLossResult } from "@/lib/ranked-stats";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

type MapWinLossChartProps = {
  result: MapWinLossResult;
};

const chartConfig = {
  wins: {
    label: "Wins",
    color: "var(--chart-win)",
  },
  losses: {
    label: "Losses",
    color: "var(--chart-loss)",
  },
} satisfies ChartConfig;

export function MapWinLossChart({ result }: MapWinLossChartProps) {
  const { data, insight } = result;

  const totalGames = data.reduce((sum, d) => sum + d.wins + d.losses, 0);

  const worstNote =
    insight.worstMap !== insight.bestMap
      ? ` \u2014 ${insight.worstMap} is your toughest at ${insight.worstWinrate}%`
      : "";
  const description = `${insight.bestMap} is your best map at ${insight.bestWinrate}% winrate${worstNote}`;

  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow="Map performance"
        title="Where do you win most?"
        description={description}
      />
      <ChartContainer config={chartConfig} className="h-[350px] w-full">
          <BarChart
            data={data}
            margin={{ top: 4, right: 4, left: -20, bottom: 60 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={80}
              fontSize={12}
            />
            <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name, item) => {
                    const payload = item.payload as typeof data[number];
                    const { wins, losses } = payload;
                    const total = wins + losses;
                    const winrate =
                      total > 0 ? Math.round((wins / total) * 100) : 0;

                    if (name === "losses") {
                      return (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span
                              className="size-2.5 shrink-0 rounded-[2px]"
                              style={{
                                backgroundColor: "var(--chart-loss)",
                              }}
                            />
                            <span className="text-muted-foreground">
                              Losses
                            </span>
                            <span className="font-mono font-medium tabular-nums">
                              {value}
                            </span>
                          </div>
                          <div className="border-border border-t pt-1 text-xs">
                            Winrate:{" "}
                            <span className="font-medium tabular-nums">
                              {winrate}%
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div className="flex items-center gap-2">
                        <span
                          className="size-2.5 shrink-0 rounded-[2px]"
                          style={{ backgroundColor: "var(--chart-win)" }}
                        />
                        <span className="text-muted-foreground">Wins</span>
                        <span className="font-mono font-medium tabular-nums">
                          {value}
                        </span>
                      </div>
                    );
                  }}
                />
              }
            />
            <Bar
              dataKey="wins"
              stackId="stack"
              fill="var(--color-wins)"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="losses"
              stackId="stack"
              fill="var(--color-losses)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
      </ChartContainer>
      <p className="text-muted-foreground text-xs">
        Based on {totalGames} matches across {data.length} maps
      </p>
    </section>
  );
}
