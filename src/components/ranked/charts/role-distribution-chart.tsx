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
import type { RoleStatsResult } from "@/lib/ranked-stats";
import { Label, Pie, PieChart } from "recharts";

type RoleDistributionChartProps = {
  result: RoleStatsResult;
};

function buildChartConfig(
  distribution: RoleStatsResult["distribution"]
): ChartConfig {
  const config: ChartConfig = {};
  for (const entry of distribution) {
    config[entry.role] = {
      label: entry.role,
      color: entry.fill,
    };
  }
  return config;
}

export function RoleDistributionChart({ result }: RoleDistributionChartProps) {
  const { distribution, insight } = result;

  const totalWeight = distribution.reduce((sum, d) => sum + d.weightedCount, 0);
  const hasData = totalWeight > 0;

  const chartConfig = buildChartConfig(distribution);
  const pieData = distribution.map((d) => ({
    ...d,
    name: d.role,
    value: d.weightedCount,
  }));

  const description = hasData
    ? `You spend ${insight.dominantPct}% of your time on ${insight.dominantRole}`
    : "Log some matches to see how you spread your time across roles";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Where do you spend your time?</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {hasData ? (
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
                          {distribution.find((d) => d.role === name)?.percentage ?? 0}%
                        </span>
                      </div>
                    )}
                    hideIndicator
                  />
                }
              />
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="role"
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
                            className="fill-foreground text-2xl font-bold tabular-nums"
                          >
                            {insight.dominantRole}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy ?? 0) + 22}
                            className="fill-muted-foreground text-sm"
                          >
                            {insight.dominantPct}%
                          </tspan>
                        </text>
                      );
                    }
                  }}
                />
              </Pie>
            </PieChart>
          </ChartContainer>
        ) : (
          <div className="flex h-[250px] items-center justify-center">
            <p className="text-muted-foreground text-sm">No data yet</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-wrap justify-center gap-3">
        {distribution.map((entry) => (
          <div key={entry.role} className="flex items-center gap-1.5 text-xs">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: entry.fill }}
              aria-hidden="true"
            />
            <span className="text-muted-foreground">{entry.role}</span>
          </div>
        ))}
      </CardFooter>
    </Card>
  );
}
