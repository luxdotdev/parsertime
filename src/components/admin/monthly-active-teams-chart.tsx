"use client";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<"light" | "dark", string> }
  );
};

export type MonthlyActiveTeamsData = {
  month: string;
  activeTeams: number;
};

type MonthlyActiveTeamsChartProps = {
  data: MonthlyActiveTeamsData[];
};

export function MonthlyActiveTeamsChart({
  data,
}: MonthlyActiveTeamsChartProps) {
  const chartConfig: ChartConfig = {
    activeTeams: {
      label: "Active Teams",
      color: "var(--chart-4)",
    },
  };

  return (
    <ChartContainer config={chartConfig} className="h-[200px] w-full">
      <LineChart
        accessibilityLayer
        data={data}
        margin={{ left: 12, right: 12 }}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="month"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tickFormatter={(value: string) => value.slice(0, 3)}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={32}
          allowDecimals={false}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line
          dataKey="activeTeams"
          type="monotone"
          stroke="var(--color-activeTeams)"
          strokeWidth={2}
          dot={{ fill: "var(--color-activeTeams)", r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ChartContainer>
  );
}
