"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { GroupSizeResult } from "@/lib/ranked-stats";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

type GroupSizeBreakdownChartProps = {
  result: GroupSizeResult;
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

function buildDescription(result: GroupSizeResult): string {
  const { data } = result;
  if (data.length === 0) return "Track more matches to see your group habits";

  const total = data.reduce((sum, e) => sum + e.total, 0);
  if (total === 0) return "Track more matches to see your group habits";

  const soloEntry = data.find((e) => e.groupSize === 1);
  const soloGames = soloEntry?.total ?? 0;
  const groupedGames = total - soloGames;

  if (soloGames === 0) {
    return `All ${total} games played grouped`;
  }
  if (groupedGames === 0) {
    return `All ${total} games played solo`;
  }

  const soloPct = Math.round((soloGames / total) * 100);
  return `${soloPct}% of your ${total} games are solo \u2014 ${100 - soloPct}% grouped`;
}

export function GroupSizeBreakdownChart({
  result,
}: GroupSizeBreakdownChartProps) {
  const { data } = result;

  const description = buildDescription(result);
  const totalGames = data.reduce((sum, e) => sum + e.total, 0);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Where do you play most?</CardTitle>
          <CardDescription>
            Track more matches to see your group habits
          </CardDescription>
        </CardHeader>
        <CardContent className="flex h-[280px] items-center justify-center">
          <p className="text-muted-foreground text-sm">No data yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Where do you play most?</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[280px] w-full">
          <BarChart
            data={data}
            margin={{ top: 8, right: 8, left: -20, bottom: 4 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              fontSize={12}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              fontSize={12}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name, item) => {
                    const payload = item.payload as (typeof data)[number];
                    const { wins, draws, total, winrate } = payload;

                    if (name === "losses") {
                      return (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span
                              className="size-2.5 shrink-0 rounded-[2px]"
                              style={{ backgroundColor: "var(--chart-loss)" }}
                            />
                            <span className="text-muted-foreground">
                              Losses
                            </span>
                            <span className="font-mono font-medium tabular-nums">
                              {value}
                            </span>
                          </div>
                          {draws > 0 && (
                            <div className="text-muted-foreground text-xs">
                              {draws} draw{draws !== 1 ? "s" : ""}
                            </div>
                          )}
                          <div className="border-border border-t pt-1 text-xs">
                            Winrate:{" "}
                            <span className="font-medium tabular-nums">
                              {winrate}%
                            </span>{" "}
                            over {total} games
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
                          {wins}
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
      </CardContent>
      <CardFooter>
        <p className="text-muted-foreground text-xs">
          Based on {totalGames} matches across {data.length} group size
          {data.length !== 1 ? "s" : ""}
        </p>
      </CardFooter>
    </Card>
  );
}
