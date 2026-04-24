"use client";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

type MonthlyUserData = {
  month: string;
  users: number;
};

type MonthlyUserChartProps = {
  twelveMonth: MonthlyUserData[];
  historical: MonthlyUserData[];
};

const chartConfig: ChartConfig = {
  users: {
    label: "Users",
    color: "var(--chart-1)",
  },
};

function renderChart(data: MonthlyUserData[], opts: { shortTicks: boolean }) {
  return (
    <ChartContainer config={chartConfig} className="h-[200px] w-full">
      <BarChart accessibilityLayer data={data}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="month"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tickFormatter={(value: string) =>
            opts.shortTicks ? value.slice(0, 3) : value
          }
          interval={opts.shortTicks ? 0 : "preserveStartEnd"}
          minTickGap={opts.shortTicks ? 0 : 24}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="users" fill="var(--color-users)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}

export function MonthlyUserChart({
  twelveMonth,
  historical,
}: MonthlyUserChartProps) {
  return (
    <Tabs defaultValue="twelve-months" className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="twelve-months">Last 12 months</TabsTrigger>
        <TabsTrigger value="historical">All time</TabsTrigger>
      </TabsList>
      <TabsContent value="twelve-months">
        {renderChart(twelveMonth, { shortTicks: true })}
      </TabsContent>
      <TabsContent value="historical">
        {renderChart(historical, { shortTicks: false })}
      </TabsContent>
    </Tabs>
  );
}
