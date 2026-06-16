"use client";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Cell, Pie, PieChart } from "recharts";

type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<"light" | "dark", string> }
  );
};

export type ActiveUsersPieData = {
  status: "Active" | "Inactive";
  count: number;
  percentage: number;
};

type ActiveUsersPieChartProps = {
  data: ActiveUsersPieData[];
};

export function ActiveUsersPieChart({ data }: ActiveUsersPieChartProps) {
  const chartConfig: ChartConfig = {
    Active: {
      label: "Active",
      color: "var(--chart-2)",
    },
    Inactive: {
      label: "Inactive",
      color: "var(--chart-1)",
    },
  };

  const COLORS: Record<ActiveUsersPieData["status"], string> = {
    Active: "var(--chart-2)",
    Inactive: "var(--chart-1)",
  };

  return (
    <ChartContainer config={chartConfig} className="h-[200px] w-full">
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="status"
          cx="50%"
          cy="50%"
          outerRadius={60}
        >
          {data.map((entry) => (
            <Cell key={entry.status} fill={COLORS[entry.status]} />
          ))}
        </Pie>
        <ChartTooltip
          content={<ChartTooltipContent />}
          formatter={(value, name) => {
            const entry = data.find((d) => d.status === name);
            return [
              `${String(value)} (${entry?.percentage ?? 0}%)`,
              String(name),
            ];
          }}
        />
        <ChartLegend content={<ChartLegendContent />} />
      </PieChart>
    </ChartContainer>
  );
}
