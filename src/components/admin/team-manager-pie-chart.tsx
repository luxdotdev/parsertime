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

type TeamManagerData = {
  role: string;
  count: number;
  percentage: number;
};

type TeamManagerPieChartProps = {
  data: TeamManagerData[];
};

export function TeamManagerPieChart({ data }: TeamManagerPieChartProps) {
  const chartConfig: ChartConfig = {
    "Regular Users": {
      label: "Regular Users",
      color: "var(--chart-1)",
    },
    "Team Managers": {
      label: "Team Managers",
      color: "var(--chart-4)",
    },
  };

  const COLORS = ["var(--chart-1)", "var(--chart-4)"];

  return (
    <ChartContainer config={chartConfig} className="h-[200px] w-full">
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="role"
          cx="50%"
          cy="50%"
          outerRadius={60}
          fill="#8884d8"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <ChartTooltip
          content={<ChartTooltipContent />}
          formatter={(value, name) => [
            `${value} (${data.find((d) => d.role === name)?.percentage}%)`,
            name,
          ]}
        />
        <ChartLegend content={<ChartLegendContent />} />
      </PieChart>
    </ChartContainer>
  );
}
