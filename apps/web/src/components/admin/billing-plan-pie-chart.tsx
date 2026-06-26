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

type BillingPlanData = {
  plan: string;
  count: number;
  percentage: number;
};

type BillingPlanPieChartProps = {
  data: BillingPlanData[];
};

export function BillingPlanPieChart({ data }: BillingPlanPieChartProps) {
  const chartConfig: ChartConfig = {
    FREE: {
      label: "Free",
      color: "var(--chart-1)",
    },
    BASIC: {
      label: "Basic",
      color: "var(--chart-3)",
    },
    PREMIUM: {
      label: "Premium",
      color: "var(--chart-5)",
    },
  };

  const COLORS = [
    "var(--chart-1)", // FREE
    "var(--chart-3)", // BASIC
    "var(--chart-5)", // PREMIUM
  ];

  return (
    <ChartContainer config={chartConfig} className="h-[200px] w-full">
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="plan"
          cx="50%"
          cy="50%"
          outerRadius={60}
          fill="#8884d8"
        >
          {data.map((entry) => (
            <Cell
              key={entry.plan}
              fill={COLORS[data.indexOf(entry) % COLORS.length]}
            />
          ))}
        </Pie>
        <ChartTooltip
          content={<ChartTooltipContent />}
          formatter={(value, name) => {
            const entry = data.find((d) => d.plan === name);
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
