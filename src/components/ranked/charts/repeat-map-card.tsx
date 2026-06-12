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
import type { RepeatMapResult } from "@/lib/ranked-stats";
import { AlertTriangle, TrendingDown, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";

type RepeatMapCardProps = {
  result: RepeatMapResult;
};

const chartConfig = {
  winrate: {
    label: "Winrate",
  },
} satisfies ChartConfig;

export function RepeatMapCard({ result }: RepeatMapCardProps) {
  const {
    firstOccurrenceWinrate,
    repeatWinrate,
    firstOccurrenceTotal,
    repeatTotal,
    delta,
    hasEnoughData,
    insight,
  } = result;

  const chartData = [
    {
      label: "First time",
      winrate: firstOccurrenceWinrate,
      total: firstOccurrenceTotal,
    },
    {
      label: "Repeat",
      winrate: repeatWinrate,
      total: repeatTotal,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Repeat Map Performance</CardTitle>
        <CardDescription>
          {hasEnoughData
            ? delta > 5
              ? `You play better on repeat maps — +${delta}% when the map reappears in your session`
              : delta < -5
                ? `You underperform on repeat maps — ${delta}% when the map reappears`
                : "Repeat maps have little impact on your performance"
            : "Does seeing the same map twice in a session affect your winrate?"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasEnoughData ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <AlertTriangle
              className="text-muted-foreground size-8"
              aria-hidden="true"
            />
            <p className="text-muted-foreground text-sm">{insight}</p>
            <p className="text-muted-foreground/70 text-xs">
              {repeatTotal} repeat{" "}
              {repeatTotal !== 1 ? "instances" : "instance"} recorded — need
              5+
            </p>
          </div>
        ) : (
          <>
            <ChartContainer config={chartConfig} className="h-[160px] w-full">
              <BarChart
                data={chartData}
                margin={{ top: 4, right: 8, left: -8, bottom: 4 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                />
                <YAxis
                  domain={[0, 100]}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}%`}
                  fontSize={11}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, _name, item) => {
                        const d = item.payload as (typeof chartData)[number];
                        return (
                          <div className="flex flex-col gap-0.5 text-xs">
                            <span className="font-medium">{d.label}</span>
                            <span className="font-mono tabular-nums">
                              {value}% winrate
                            </span>
                            <span className="text-muted-foreground">
                              {d.total} game{d.total !== 1 ? "s" : ""}
                            </span>
                          </div>
                        );
                      }}
                    />
                  }
                />
                <Bar dataKey="winrate" radius={[4, 4, 0, 0]} maxBarSize={60}>
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.label}
                      fill={
                        entry.winrate >= 55
                          ? "var(--chart-win)"
                          : entry.winrate >= 45
                            ? "oklch(0.72 0.15 50)"
                            : "var(--chart-loss)"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>

            <div className="grid grid-cols-2 gap-3 border-t pt-3">
              <div className="text-center">
                <p className="font-mono text-2xl font-semibold tabular-nums">
                  {firstOccurrenceWinrate}%
                </p>
                <p className="text-muted-foreground text-xs">First time</p>
                <p className="text-muted-foreground/70 text-xs">
                  {firstOccurrenceTotal} games
                </p>
              </div>
              <div className="text-center">
                <p className="font-mono text-2xl font-semibold tabular-nums">
                  {repeatWinrate}%
                </p>
                <p className="text-muted-foreground text-xs">Repeat</p>
                <p className="text-muted-foreground/70 text-xs">
                  {repeatTotal} games
                </p>
              </div>
            </div>

            {Math.abs(delta) >= 5 && (
              <div
                className={`flex items-center gap-2 rounded-md p-2 text-sm ${
                  delta > 0
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : "bg-red-500/10 text-red-700 dark:text-red-400"
                }`}
              >
                {delta > 0 ? (
                  <TrendingUp className="size-4 shrink-0" aria-hidden="true" />
                ) : (
                  <TrendingDown
                    className="size-4 shrink-0"
                    aria-hidden="true"
                  />
                )}
                <span>{insight}</span>
              </div>
            )}
          </>
        )}
      </CardContent>
      <CardFooter>
        <p className="text-muted-foreground text-xs">
          Sessions grouped by calendar day — a repeat is when the same map
          appears more than once
        </p>
      </CardFooter>
    </Card>
  );
}
