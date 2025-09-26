"use client";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<"light" | "dark", string> }
  );
};

type TeamCreationData = {
  month: string;
  teams: number;
};

type TeamCreationChartProps = {
  data: TeamCreationData[];
};

export function TeamCreationChart({ data }: TeamCreationChartProps) {
  const chartConfig: ChartConfig = {
    teams: {
      label: "Teams Created",
      color: "var(--chart-3)",
    },
  };

  return (
    <ChartContainer config={chartConfig} className="h-[200px] w-full">
      <BarChart accessibilityLayer data={data}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="month"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tickFormatter={(value: string) => value.slice(0, 3)}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="teams" fill="var(--color-teams)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}
