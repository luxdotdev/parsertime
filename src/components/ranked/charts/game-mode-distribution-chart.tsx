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
import type { GameModeDistResult } from "@/lib/ranked-stats";
import { Label, Pie, PieChart } from "recharts";

type GameModeDistributionChartProps = {
  result: GameModeDistResult;
};

function buildChartConfig(
  data: GameModeDistResult["data"]
): Record<string, ChartConfig[string]> {
  const config: Record<string, ChartConfig[string]> = {};
  for (const entry of data) {
    config[entry.mode] = {
      label: entry.mode,
      color: entry.fill,
    };
  }
  return config;
}

export function GameModeDistributionChart({
  result,
}: GameModeDistributionChartProps) {
  const { data, insight } = result;

  const totalMatches = data.reduce((sum, d) => sum + d.count, 0);
  const chartConfig = buildChartConfig(data);
  const pieData = data.map((d) => ({ ...d, name: d.mode }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>What modes do you play?</CardTitle>
        <CardDescription>
          {insight.dominantMode} makes up {insight.dominantPct}% of your games
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square h-[250px]"
        >
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{name}</span>
                      <span className="font-mono font-medium tabular-nums">
                        {value} matches
                      </span>
                    </div>
                  )}
                  hideIndicator
                />
              }
            />
            <Pie
              data={pieData}
              dataKey="count"
              nameKey="mode"
              innerRadius={60}
              strokeWidth={2}
              stroke="var(--color-background)"
            >
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-3xl font-bold tabular-nums"
                        >
                          {totalMatches}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy ?? 0) + 24}
                          className="fill-muted-foreground text-sm"
                        >
                          matches
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex flex-wrap justify-center gap-3">
        {data.map((entry) => (
          <div key={entry.mode} className="flex items-center gap-1.5 text-xs">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: entry.fill }}
            />
            <span className="text-muted-foreground">{entry.mode}</span>
          </div>
        ))}
      </CardFooter>
    </Card>
  );
}
