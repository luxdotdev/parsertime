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
import type { DayOfWeekEntry, DayOfWeekResult } from "@/lib/ranked-stats";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";

type DayOfWeekCardProps = {
  result: DayOfWeekResult;
};

const chartConfig = {
  winrate: {
    label: "Winrate",
  },
} satisfies ChartConfig;

function dayBarColor(winrate: number, total: number): string {
  if (total === 0) return "var(--muted)";
  if (winrate >= 55) return "var(--chart-win)";
  if (winrate >= 45) return "oklch(0.72 0.15 50)";
  return "var(--chart-loss)";
}

function deltaBadgeClasses(delta: number): string {
  if (delta > 0)
    return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  if (delta < 0) return "bg-red-500/10 text-red-700 dark:text-red-400";
  return "bg-muted text-muted-foreground";
}

export function DayOfWeekCard({ result }: DayOfWeekCardProps) {
  const { data, bestDay, worstDay, weekdayWinrate, weekendWinrate, insight } =
    result;

  const hasData = data.some((d) => d.total > 0);

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Best Day to Play</CardTitle>
          <CardDescription>
            Are you better on weekdays or weekends?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <p className="text-muted-foreground text-sm">No matches yet</p>
            <p className="text-muted-foreground/70 text-xs">
              Track matches across different days to see when you perform best.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const delta = weekendWinrate - weekdayWinrate;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Best Day to Play</CardTitle>
        <CardDescription>{insight}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ChartContainer config={chartConfig} className="h-[220px] w-full">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
          >
            <CartesianGrid horizontal={false} strokeOpacity={0.3} />
            <XAxis
              type="number"
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              fontSize={11}
              tickFormatter={(v) => `${v}%`}
            />
            <YAxis
              type="category"
              dataKey="day"
              tickLine={false}
              axisLine={false}
              fontSize={12}
              width={32}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  hideIndicator
                  formatter={(_value, _name, item) => {
                    const d = item.payload as DayOfWeekEntry;
                    if (d.total === 0) {
                      return (
                        <span className="text-muted-foreground text-xs">
                          No games on {d.day}
                        </span>
                      );
                    }
                    return (
                      <div className="flex flex-col gap-0.5 text-xs">
                        <span className="font-mono font-medium tabular-nums">
                          {d.winrate}% winrate
                        </span>
                        <span className="text-muted-foreground">
                          {d.wins}W – {d.losses}L
                          {d.draws > 0 ? ` – ${d.draws}D` : ""} &middot;{" "}
                          {d.total} game{d.total !== 1 ? "s" : ""}
                        </span>
                      </div>
                    );
                  }}
                />
              }
            />
            <Bar dataKey="winrate" radius={[0, 4, 4, 0]} maxBarSize={24}>
              {data.map((d) => (
                <Cell key={d.day} fill={dayBarColor(d.winrate, d.total)} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>

        <div className="grid grid-cols-2 gap-3 border-t pt-3">
          <div className="text-center">
            <p className="font-mono text-lg font-semibold tabular-nums">
              {weekdayWinrate}%
            </p>
            <p className="text-muted-foreground text-xs">Weekdays</p>
            <p className="text-muted-foreground/70 text-xs">Mon – Thu</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5">
              <p className="font-mono text-lg font-semibold tabular-nums">
                {weekendWinrate}%
              </p>
              {delta !== 0 && (
                <span
                  className={`rounded px-1 py-0.5 text-[10px] font-semibold tabular-nums ${deltaBadgeClasses(delta)}`}
                  aria-label={`${Math.abs(delta)}% ${delta > 0 ? "better" : "worse"} than weekdays`}
                >
                  {delta > 0 ? "+" : ""}
                  {delta}%
                </span>
              )}
            </div>
            <p className="text-muted-foreground text-xs">Weekends</p>
            <p className="text-muted-foreground/70 text-xs">Fri – Sun</p>
          </div>
        </div>

        {bestDay && worstDay && bestDay !== worstDay && (
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md bg-emerald-500/10 p-2 text-center">
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                {bestDay}
              </p>
              <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80">
                Best day
              </p>
            </div>
            <div className="rounded-md bg-red-500/10 p-2 text-center">
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                {worstDay}
              </p>
              <p className="text-xs text-red-700/80 dark:text-red-400/80">
                Toughest day
              </p>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <p className="text-muted-foreground text-xs">
          Matches are attributed to the day the session started.
        </p>
      </CardFooter>
    </Card>
  );
}
