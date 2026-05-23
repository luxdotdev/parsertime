"use client";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslations } from "next-intl";
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
  twelveMonth: MonthlyActiveUsersData[];
  historical: MonthlyActiveUsersData[];
};

function renderChart(
  data: MonthlyActiveUsersData[],
  opts: { chartConfig: ChartConfig; shortTicks: boolean }
) {
  return (
    <ChartContainer config={opts.chartConfig} className="h-[200px] w-full">
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

export function MonthlyActiveUsersChart({
  twelveMonth,
  historical,
}: MonthlyActiveUsersChartProps) {
  const t = useTranslations("settingsPage.admin.analytics.charts");
  const chartConfig: ChartConfig = {
    activeUsers: {
      label: t("activeUsers"),
      color: "var(--chart-2)",
    },
  };

  return (
    <Tabs defaultValue="twelve-months" className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="twelve-months">{t("last12Months")}</TabsTrigger>
        <TabsTrigger value="historical">{t("allTime")}</TabsTrigger>
      </TabsList>
      <TabsContent value="twelve-months">
        {renderChart(twelveMonth, { chartConfig, shortTicks: true })}
      </TabsContent>
      <TabsContent value="historical">
        {renderChart(historical, { chartConfig, shortTicks: false })}
      </TabsContent>
    </Tabs>
  );
}
