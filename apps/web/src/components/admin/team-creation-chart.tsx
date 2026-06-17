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

type TeamCreationData = {
  month: string;
  teams: number;
  projected: number;
};

type TeamCreationChartProps = {
  twelveMonth: TeamCreationData[];
  historical: TeamCreationData[];
};

function renderChart(
  data: TeamCreationData[],
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
        <Bar dataKey="teams" stackId="a" fill="var(--color-teams)" radius={4} />
        <Bar
          dataKey="projected"
          stackId="a"
          fill="var(--color-projected)"
          fillOpacity={0.4}
          radius={4}
        />
      </BarChart>
    </ChartContainer>
  );
}

export function TeamCreationChart({
  twelveMonth,
  historical,
}: TeamCreationChartProps) {
  const t = useTranslations("settingsPage.admin.analytics.charts");
  const chartConfig: ChartConfig = {
    teams: {
      label: t("teamsCreated"),
      color: "var(--chart-3)",
    },
    projected: {
      label: t("projected"),
      color: "var(--chart-3)",
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
