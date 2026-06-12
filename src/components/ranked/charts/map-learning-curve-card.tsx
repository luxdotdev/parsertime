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
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { MAP_LEARNING_MIN_GAMES } from "@/lib/ranked-stats";
import type { MapLearningResult } from "@/lib/ranked-stats";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts";

type MapLearningCurveCardProps = {
  result: MapLearningResult;
};

const chartConfig = {
  earlyWinrate: {
    label: "Early games",
    color: "var(--chart-3)",
  },
  lateWinrate: {
    label: "Recent games",
    color: "var(--chart-win)",
  },
} satisfies ChartConfig;

export function MapLearningCurveCard({ result }: MapLearningCurveCardProps) {
  const { data, insight } = result;

  const qualified = data.filter((d) => d.hasEnoughData);

  if (qualified.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Map Learning Curve</CardTitle>
          <CardDescription>
            Play at least {MAP_LEARNING_MIN_GAMES} games on a map to see your
            improvement over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground py-8 text-center text-sm">
            Not enough data yet — need {MAP_LEARNING_MIN_GAMES}+ games per map
          </p>
        </CardContent>
      </Card>
    );
  }

  const insightText =
    insight.mostImproved && insight.improvementDelta > 0
      ? `You've improved most on ${insight.mostImproved} (+${insight.improvementDelta}%)`
      : insight.mostDeclined && insight.declineDelta < 0
        ? `${insight.mostDeclined} is your toughest to master (${insight.declineDelta}%)`
        : "Comparing your early vs recent performance per map";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Map Learning Curve</CardTitle>
        <CardDescription>
          {insight.mostImproved && insight.improvementDelta > 0 ? (
            <>
              You&apos;ve improved most on {insight.mostImproved} (+
              {insight.improvementDelta}%) — first half vs second half of games
            </>
          ) : (
            "First half vs second half of your games on each map"
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart
            data={qualified}
            margin={{ top: 4, right: 8, left: -8, bottom: 60 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="map"
              tickLine={false}
              axisLine={false}
              interval={0}
              angle={-40}
              textAnchor="end"
              height={80}
              fontSize={11}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              fontSize={11}
            />
            <ReferenceLine
              y={50}
              stroke="var(--muted-foreground)"
              strokeDasharray="4 2"
              strokeOpacity={0.4}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name, item) => {
                    const d = item.payload as (typeof qualified)[number];
                    if (name === "lateWinrate") {
                      const delta = d.lateWinrate - d.earlyWinrate;
                      return (
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span
                              className="size-2.5 shrink-0 rounded-[2px]"
                              style={{ backgroundColor: "var(--chart-win)" }}
                            />
                            <span className="text-muted-foreground">
                              Recent ({d.lateGames}g)
                            </span>
                            <span className="font-mono font-medium tabular-nums">
                              {value}%
                            </span>
                          </div>
                          <div className="border-border border-t pt-1 text-xs">
                            {delta > 0 ? (
                              <span className="flex items-center gap-1 text-emerald-500">
                                <TrendingUp className="size-3" />+{delta}% improvement
                              </span>
                            ) : delta < 0 ? (
                              <span className="flex items-center gap-1 text-red-500">
                                <TrendingDown className="size-3" />
                                {delta}% decline
                              </span>
                            ) : (
                              <span className="text-muted-foreground">
                                No change
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div className="flex items-center gap-2">
                        <span
                          className="size-2.5 shrink-0 rounded-[2px]"
                          style={{ backgroundColor: "var(--chart-3)" }}
                        />
                        <span className="text-muted-foreground">
                          Early ({d.earlyGames}g)
                        </span>
                        <span className="font-mono font-medium tabular-nums">
                          {value}%
                        </span>
                      </div>
                    );
                  }}
                />
              }
            />
            <Bar
              dataKey="earlyWinrate"
              fill="var(--color-earlyWinrate)"
              radius={[4, 4, 0, 0]}
              maxBarSize={20}
            />
            <Bar
              dataKey="lateWinrate"
              fill="var(--color-lateWinrate)"
              radius={[4, 4, 0, 0]}
              maxBarSize={20}
            />
            <ChartLegend content={<ChartLegendContent />} />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <p className="text-muted-foreground text-xs">
          Requires {MAP_LEARNING_MIN_GAMES}+ games per map. Showing{" "}
          {qualified.length} qualifying map{qualified.length !== 1 ? "s" : ""}
          {insightText ? ` — ${insightText}` : ""}
        </p>
      </CardFooter>
    </Card>
  );
}
