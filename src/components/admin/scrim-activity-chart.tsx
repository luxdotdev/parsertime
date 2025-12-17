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

type ScrimActivityData = {
  date: string;
  scrims: number;
};

type ScrimActivityChartProps = {
  data: ScrimActivityData[];
};

export function ScrimActivityChart({ data }: ScrimActivityChartProps) {
  const chartConfig: ChartConfig = {
    scrims: {
      label: "Scrims Created",
      color: "var(--chart-2)",
    },
  };

  // Format date for display (show only day/month)
  function formatXAxisLabel(value: string) {
    const date = new Date(value);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }

  return (
    <ChartContainer config={chartConfig} className="h-[200px] w-full">
      <BarChart accessibilityLayer data={data}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tickFormatter={formatXAxisLabel}
        />
        <ChartTooltip
          content={<ChartTooltipContent />}
          labelFormatter={(value) => {
            const date = new Date(value as string);
            return date.toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            });
          }}
        />
        <Bar dataKey="scrims" fill="var(--color-scrims)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}
