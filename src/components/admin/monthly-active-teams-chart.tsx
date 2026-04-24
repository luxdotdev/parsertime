"use client";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  twelveMonth: MonthlyActiveTeamsData[];
  historical: MonthlyActiveTeamsData[];
};

const chartConfig: ChartConfig = {
  activeTeams: {
    label: "Active Teams",
    color: "var(--chart-4)",
  },
};

function renderChart(
  data: MonthlyActiveTeamsData[],
  opts: { shortTicks: boolean }
) {
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
          tickFormatter={(value: string) =>
            opts.shortTicks ? value.slice(0, 3) : value
          }
          interval={opts.shortTicks ? 0 : "preserveStartEnd"}
          minTickGap={opts.shortTicks ? 0 : 24}
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

export function MonthlyActiveTeamsChart({
  twelveMonth,
  historical,
}: MonthlyActiveTeamsChartProps) {
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
