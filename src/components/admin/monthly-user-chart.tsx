"use client";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslations } from "next-intl";
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

function renderChart(
  data: MonthlyUserData[],
  opts: { chartConfig: ChartConfig; shortTicks: boolean }
) {
  return (
    <ChartContainer config={opts.chartConfig} className="h-[200px] w-full">
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
  const t = useTranslations("settingsPage.admin.analytics.charts");
  const chartConfig: ChartConfig = {
    users: {
      label: t("users"),
      color: "var(--chart-1)",
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
