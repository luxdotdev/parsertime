"use client";

import { Badge } from "@/components/ui/badge";
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
import type { ScoutingMapAnalysis } from "@/data/scouting-dto";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

type MapPerformanceChartProps = {
  mapAnalysis: ScoutingMapAnalysis;
};

export function MapPerformanceChart({ mapAnalysis }: MapPerformanceChartProps) {
  const t = useTranslations("scoutingPage.team.maps");

  const mapTypeData = mapAnalysis.byMapType.map((entry) => ({
    mode: entry.mapType,
    winRate: Math.round(entry.weightedWinRate * 10) / 10,
    played: entry.played,
  }));

  const chartConfig: ChartConfig = {
    winRate: {
      label: t("weightedWinRate"),
      color: "var(--chart-1)",
    },
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("byMapType")}</CardTitle>
          <CardDescription>{t("byMapTypeDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {mapTypeData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <BarChart accessibilityLayer data={mapTypeData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="mode"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 100]}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => `${Number(value)}%`}
                    />
                  }
                />
                <Bar
                  dataKey="winRate"
                  fill="var(--color-winRate)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          ) : (
            <p className="text-muted-foreground py-6 text-center text-sm">
              {t("noMaps")}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("byMap")}</CardTitle>
          <CardDescription>{t("byMapDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {mapAnalysis.byMap.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {mapAnalysis.byMap.map((map) => (
                <MapCard key={map.name} map={map} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground py-6 text-center text-sm">
              {t("noMaps")}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

type MapCardProps = {
  map: ScoutingMapAnalysis["byMap"][number];
};

function MapCard({ map }: MapCardProps) {
  const t = useTranslations("scoutingPage.team.maps");
  const wr = map.weightedWinRate;

  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        wr >= 60
          ? "border-emerald-500/30 bg-emerald-500/5"
          : wr <= 40
            ? "border-red-500/30 bg-red-500/5"
            : "border-border"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{map.name}</span>
        <Badge
          variant={wr >= 50 ? "default" : "destructive"}
          className="tabular-nums"
        >
          {wr.toFixed(0)}%
        </Badge>
      </div>
      <div className="text-muted-foreground mt-1 flex gap-3 text-xs tabular-nums">
        <span>
          {t("played")}: {map.played}
        </span>
        <span>
          {t("won")}: {map.won}
        </span>
      </div>
    </div>
  );
}
