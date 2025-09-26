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

type SignupMethodData = {
  method: string;
  count: number;
  percentage: number;
};

type SignupMethodPieChartProps = {
  data: SignupMethodData[];
};

export function SignupMethodPieChart({ data }: SignupMethodPieChartProps) {
  const chartConfig: ChartConfig = {
    Email: {
      label: "Email",
      color: "var(--chart-1)",
    },
    Discord: {
      label: "Discord",
      color: "var(--chart-2)",
    },
    Google: {
      label: "Google",
      color: "var(--chart-3)",
    },
    GitHub: {
      label: "GitHub",
      color: "var(--chart-4)",
    },
  };

  const COLORS = [
    "var(--chart-1)", // Email
    "var(--chart-2)", // Discord
    "var(--chart-3)", // Google
    "var(--chart-4)", // GitHub
    "var(--chart-5)", // Fallback
  ];

  return (
    <ChartContainer config={chartConfig} className="h-[200px] w-full">
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="method"
          cx="50%"
          cy="50%"
          outerRadius={60}
          fill="#8884d8"
        >
          {data.map((entry) => (
            <Cell
              key={entry.method}
              fill={COLORS[data.indexOf(entry) % COLORS.length]}
            />
          ))}
        </Pie>
        <ChartTooltip
          content={<ChartTooltipContent />}
          formatter={(value, name) => {
            const entry = data.find((d) => d.method === name);
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
