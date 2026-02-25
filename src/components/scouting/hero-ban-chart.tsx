"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ChartConfig } from "@/components/ui/chart";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { ScoutingHeroBans } from "@/data/scouting-dto";
import { useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

type HeroBanChartProps = {
  heroBans: ScoutingHeroBans;
};

const MAX_BARS = 10;

export function HeroBanChart({ heroBans }: HeroBanChartProps) {
  const t = useTranslations("scoutingPage.team.heroBans");

  const bansAgainstData = heroBans.bansAgainstTeam
    .slice(0, MAX_BARS)
    .map((b) => ({ hero: b.hero, count: b.rawCount, weighted: b.weightedCount }));

  const bansByData = heroBans.bansByTeam
    .slice(0, MAX_BARS)
    .map((b) => ({ hero: b.hero, count: b.rawCount, weighted: b.weightedCount }));

  const bansAgainstConfig: ChartConfig = {
    weighted: {
      label: t("weighted"),
      color: "var(--chart-1)",
    },
  };

  const bansByConfig: ChartConfig = {
    weighted: {
      label: t("weighted"),
      color: "var(--chart-2)",
    },
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{t("bansAgainstTeam")}</CardTitle>
          <CardDescription>{t("bansAgainstDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {bansAgainstData.length > 0 ? (
            <BanBarChart data={bansAgainstData} config={bansAgainstConfig} />
          ) : (
            <p className="text-muted-foreground py-6 text-center text-sm">
              {t("noBans")}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("bansByTeam")}</CardTitle>
          <CardDescription>{t("bansByDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {bansByData.length > 0 ? (
            <BanBarChart data={bansByData} config={bansByConfig} />
          ) : (
            <p className="text-muted-foreground py-6 text-center text-sm">
              {t("noBans")}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

type BanBarChartProps = {
  data: { hero: string; count: number; weighted: number }[];
  config: ChartConfig;
};

function BanBarChart({ data, config }: BanBarChartProps) {
  const chartHeight = Math.max(200, data.length * 36);

  return (
    <ChartContainer
      config={config}
      className="w-full"
      style={{ height: chartHeight }}
    >
      <BarChart
        accessibilityLayer
        data={data}
        layout="vertical"
        margin={{ left: 0, right: 16 }}
      >
        <CartesianGrid horizontal={false} />
        <YAxis
          dataKey="hero"
          type="category"
          tickLine={false}
          axisLine={false}
          width={100}
          tick={{ fontSize: 12 }}
        />
        <XAxis type="number" tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar
          dataKey="weighted"
          fill="var(--color-weighted)"
          radius={[0, 4, 4, 0]}
        />
      </BarChart>
    </ChartContainer>
  );
}
