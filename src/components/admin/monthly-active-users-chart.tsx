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

export type MonthlyActiveUsersData = {
  month: string;
  activeUsers: number;
};

type MonthlyActiveUsersChartProps = {
  data: MonthlyActiveUsersData[];
};

export function MonthlyActiveUsersChart({
  data,
}: MonthlyActiveUsersChartProps) {
  const chartConfig: ChartConfig = {
    activeUsers: {
      label: "Active Users",
      color: "var(--chart-2)",
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
          dataKey="activeUsers"
          type="monotone"
          stroke="var(--color-activeUsers)"
          strokeWidth={2}
          dot={{ fill: "var(--color-activeUsers)", r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ChartContainer>
  );
}
