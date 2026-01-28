"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { HeroName } from "@/types/heroes";
import { useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  XAxis,
  YAxis,
} from "recharts";

type ComparisonStats = {
  playerName: string;
  filteredHeroes: HeroName[];
  mapCount: number;
  mapIds: number[];
  aggregated: {
    eliminations: number;
    deaths: number;
    damage: number;
    healing: number;
    mitigated: number;
    heroTimePlayed: number;
    eliminationsPer10: number;
    deathsPer10: number;
    damagePer10: number;
    healingPer10: number;
    mitigatedPer10: number;
  };
  perMapBreakdown: {
    mapId: number;
    mapName: string;
    date: Date;
    heroes: HeroName[];
    stats: Record<string, number>;
  }[];
};

type ChartsViewProps = {
  stats: ComparisonStats;
  viewMode: "two-map" | "multi-map";
};

export function ChartsView({ stats, viewMode }: ChartsViewProps) {
  const t = useTranslations("comparePage.charts");

  // Prepare data for line chart (multi-map progression)
  const lineChartData = stats.perMapBreakdown.map((map, index) => ({
    name: `Map ${index + 1}`,
    fullName: map.mapName,
    elimsPer10: Number((map.stats.eliminationsPer10 ?? 0).toFixed(2)),
    deathsPer10: Number((map.stats.deathsPer10 ?? 0).toFixed(2)),
    damagePer10: Number(((map.stats.damagePer10 ?? 0) / 1000).toFixed(2)), // Scale for better visualization
  }));

  const lineChartConfig: ChartConfig = {
    elimsPer10: {
      label: t("elimsPer10"),
      color: "hsl(var(--chart-1))",
    },
    deathsPer10: {
      label: t("deathsPer10"),
      color: "hsl(var(--chart-2))",
    },
    damagePer10: {
      label: t("damagePer10K"),
      color: "hsl(var(--chart-3))",
    },
  };

  // Prepare data for bar chart (side-by-side comparison for 2 maps)
  const barChartData =
    viewMode === "two-map" && stats.perMapBreakdown.length === 2
      ? [
          {
            stat: t("eliminations"),
            map1: stats.perMapBreakdown[0].stats.eliminations ?? 0,
            map2: stats.perMapBreakdown[1].stats.eliminations ?? 0,
          },
          {
            stat: t("deaths"),
            map1: stats.perMapBreakdown[0].stats.deaths ?? 0,
            map2: stats.perMapBreakdown[1].stats.deaths ?? 0,
          },
          {
            stat: t("damage"),
            map1: (stats.perMapBreakdown[0].stats.damage ?? 0) / 1000,
            map2: (stats.perMapBreakdown[1].stats.damage ?? 0) / 1000,
          },
          {
            stat: t("healing"),
            map1: (stats.perMapBreakdown[0].stats.healing ?? 0) / 1000,
            map2: (stats.perMapBreakdown[1].stats.healing ?? 0) / 1000,
          },
          {
            stat: t("mitigated"),
            map1: (stats.perMapBreakdown[0].stats.mitigated ?? 0) / 1000,
            map2: (stats.perMapBreakdown[1].stats.mitigated ?? 0) / 1000,
          },
        ]
      : [];

  const barChartConfig: ChartConfig =
    viewMode === "two-map" && stats.perMapBreakdown.length === 2
      ? {
          map1: {
            label: stats.perMapBreakdown[0].mapName,
            color: "hsl(var(--chart-1))",
          },
          map2: {
            label: stats.perMapBreakdown[1].mapName,
            color: "hsl(var(--chart-2))",
          },
        }
      : {};

  // Prepare data for radar chart (performance profile)
  const radarChartData =
    viewMode === "two-map" && stats.perMapBreakdown.length === 2
      ? [
          {
            metric: t("elimsPer10Short"),
            map1: Number(
              (stats.perMapBreakdown[0].stats.eliminationsPer10 ?? 0).toFixed(2)
            ),
            map2: Number(
              (stats.perMapBreakdown[1].stats.eliminationsPer10 ?? 0).toFixed(2)
            ),
          },
          {
            metric: t("deathsPer10Short"),
            map1: Number(
              (20 - (stats.perMapBreakdown[0].stats.deathsPer10 ?? 0)).toFixed(
                2
              )
            ), // Invert for better visualization
            map2: Number(
              (20 - (stats.perMapBreakdown[1].stats.deathsPer10 ?? 0)).toFixed(
                2
              )
            ),
          },
          {
            metric: t("damagePer10Short"),
            map1: Number(
              (
                (stats.perMapBreakdown[0].stats.damagePer10 ?? 0) / 1000
              ).toFixed(2)
            ),
            map2: Number(
              (
                (stats.perMapBreakdown[1].stats.damagePer10 ?? 0) / 1000
              ).toFixed(2)
            ),
          },
          {
            metric: t("healingPer10Short"),
            map1: Number(
              (
                (stats.perMapBreakdown[0].stats.healingPer10 ?? 0) / 1000
              ).toFixed(2)
            ),
            map2: Number(
              (
                (stats.perMapBreakdown[1].stats.healingPer10 ?? 0) / 1000
              ).toFixed(2)
            ),
          },
          {
            metric: t("mitigatedPer10Short"),
            map1: Number(
              (
                (stats.perMapBreakdown[0].stats.mitigatedPer10 ?? 0) / 1000
              ).toFixed(2)
            ),
            map2: Number(
              (
                (stats.perMapBreakdown[1].stats.mitigatedPer10 ?? 0) / 1000
              ).toFixed(2)
            ),
          },
        ]
      : [
          {
            metric: t("elimsPer10Short"),
            value: Number(stats.aggregated.eliminationsPer10.toFixed(2)),
          },
          {
            metric: t("deathsPer10Short"),
            value: Number((20 - stats.aggregated.deathsPer10).toFixed(2)), // Invert
          },
          {
            metric: t("damagePer10Short"),
            value: Number((stats.aggregated.damagePer10 / 1000).toFixed(2)),
          },
          {
            metric: t("healingPer10Short"),
            value: Number((stats.aggregated.healingPer10 / 1000).toFixed(2)),
          },
          {
            metric: t("mitigatedPer10Short"),
            value: Number((stats.aggregated.mitigatedPer10 / 1000).toFixed(2)),
          },
        ];

  const radarChartConfig: ChartConfig =
    viewMode === "two-map" && stats.perMapBreakdown.length === 2
      ? {
          map1: {
            label: stats.perMapBreakdown[0].mapName,
            color: "hsl(var(--chart-1))",
          },
          map2: {
            label: stats.perMapBreakdown[1].mapName,
            color: "hsl(var(--chart-2))",
          },
        }
      : {
          value: {
            label: t("averagePerformance"),
            color: "hsl(var(--chart-1))",
          },
        };

  return (
    <div className="space-y-6">
      {/* Line Chart - Progression (Multi-map only) */}
      {viewMode === "multi-map" && (
        <Card>
          <CardHeader>
            <CardTitle>{t("performanceProgression")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={lineChartConfig}
              className="h-[400px] w-full"
            >
              <LineChart accessibilityLayer data={lineChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                />
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(_, payload) => {
                        const item = payload?.[0]?.payload as
                          | { fullName?: string }
                          | undefined;
                        return item?.fullName ?? "";
                      }}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Line
                  type="monotone"
                  dataKey="elimsPer10"
                  stroke="var(--color-elimsPer10)"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="deathsPer10"
                  stroke="var(--color-deathsPer10)"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="damagePer10"
                  stroke="var(--color-damagePer10)"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Bar Chart - Side by Side (Two-map only) */}
      {viewMode === "two-map" && barChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("statComparison")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={barChartConfig}
              className="h-[400px] w-full"
            >
              <BarChart accessibilityLayer data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="stat"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                />
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar
                  dataKey="map1"
                  fill="var(--color-map1)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="map2"
                  fill="var(--color-map2)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Radar Chart - Performance Profile */}
      <Card>
        <CardHeader>
          <CardTitle>{t("performanceProfile")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={radarChartConfig}
            className="h-[400px] w-full"
          >
            <RadarChart accessibilityLayer data={radarChartData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="metric" />
              <PolarRadiusAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              {viewMode === "two-map" && stats.perMapBreakdown.length === 2 ? (
                <>
                  <Radar
                    name={stats.perMapBreakdown[0].mapName}
                    dataKey="map1"
                    stroke="var(--color-map1)"
                    fill="var(--color-map1)"
                    fillOpacity={0.3}
                  />
                  <Radar
                    name={stats.perMapBreakdown[1].mapName}
                    dataKey="map2"
                    stroke="var(--color-map2)"
                    fill="var(--color-map2)"
                    fillOpacity={0.3}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                </>
              ) : (
                <Radar
                  name={t("averagePerformance")}
                  dataKey="value"
                  stroke="var(--color-value)"
                  fill="var(--color-value)"
                  fillOpacity={0.5}
                />
              )}
            </RadarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Additional Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              {t("totalEliminations")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {stats.aggregated.eliminations.toLocaleString()}
            </div>
            <p className="text-muted-foreground text-xs">
              {t("avgPer10")}: {stats.aggregated.eliminationsPer10.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              {t("totalDeaths")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {stats.aggregated.deaths.toLocaleString()}
            </div>
            <p className="text-muted-foreground text-xs">
              {t("avgPer10")}: {stats.aggregated.deathsPer10.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              {t("totalDamage")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {stats.aggregated.damage.toLocaleString()}
            </div>
            <p className="text-muted-foreground text-xs">
              {t("avgPer10")}: {stats.aggregated.damagePer10.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
