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
import type { ComparisonStats } from "@/data/comparison-dto";
import { useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ErrorBar,
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

type ChartsViewProps = {
  stats: ComparisonStats;
  viewMode: "two-map" | "multi-map";
};

type CustomTooltipProps = {
  active?: boolean;
  payload?: unknown[];
  label?: string;
  config?: ChartConfig;
};

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any */
function CustomLineChartTooltip({
  active,
  payload,
  config,
}: CustomTooltipProps) {
  const t = useTranslations("comparePage.charts");

  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const firstItem = payload[0] as any;
  const data = firstItem?.payload;

  if (!data) {
    return null;
  }

  return (
    <div className="bg-background rounded-lg border p-3 shadow-md">
      <p className="mb-2 font-semibold">{data.fullName}</p>
      <div className="space-y-1">
        {payload.map((item) => {
          const entry = item as any;

          if (!entry.dataKey || typeof entry.value !== "number") {
            return null;
          }

          const dataKey = String(entry.dataKey);
          const stdDevKey = `${dataKey}StdDev`;
          const stdDev = data[stdDevKey];
          const displayLabel =
            config?.[dataKey]?.label ?? entry.name ?? dataKey;

          return (
            <div key={dataKey} className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm">
                  {displayLabel}: {entry.value}
                </span>
              </div>
              {typeof stdDev === "number" && stdDev > 0 && (
                <div className="text-muted-foreground ml-4 text-xs">
                  {t("stdDev")}: ±{stdDev}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any */

export function ChartsView({ stats, viewMode }: ChartsViewProps) {
  const t = useTranslations("comparePage.charts");

  // Prepare data for line chart (multi-map progression) with error bars
  const lineChartData = stats.perMapBreakdown.map((map) => ({
    name: `${map.scrimName} - ${map.mapName}`,
    fullName: `${map.scrimName} - ${map.mapName}`,
    elimsPer10: Number((map.stats.eliminationsPer10 ?? 0).toFixed(2)),
    elimsPer10StdDev: Number(
      (stats.aggregated.eliminationsPer10StdDev ?? 0).toFixed(2)
    ),
    elimsPer10Error: [
      Number(
        Math.max(
          0,
          (map.stats.eliminationsPer10 ?? 0) -
            (stats.aggregated.eliminationsPer10StdDev ?? 0)
        ).toFixed(2)
      ),
      Number(
        (
          (map.stats.eliminationsPer10 ?? 0) +
          (stats.aggregated.eliminationsPer10StdDev ?? 0)
        ).toFixed(2)
      ),
    ],
    deathsPer10: Number((map.stats.deathsPer10 ?? 0).toFixed(2)),
    deathsPer10StdDev: Number(
      (stats.aggregated.deathsPer10StdDev ?? 0).toFixed(2)
    ),
    deathsPer10Error: [
      Number(
        Math.max(
          0,
          (map.stats.deathsPer10 ?? 0) -
            (stats.aggregated.deathsPer10StdDev ?? 0)
        ).toFixed(2)
      ),
      Number(
        (
          (map.stats.deathsPer10 ?? 0) +
          (stats.aggregated.deathsPer10StdDev ?? 0)
        ).toFixed(2)
      ),
    ],
    damagePer10: Number(((map.stats.allDamagePer10 ?? 0) / 1000).toFixed(2)), // Scale for better visualization
    damagePer10StdDev: Number(
      ((stats.aggregated.allDamagePer10StdDev ?? 0) / 1000).toFixed(2)
    ),
    damagePer10Error: [
      Number(
        Math.max(
          0,
          ((map.stats.allDamagePer10 ?? 0) -
            (stats.aggregated.allDamagePer10StdDev ?? 0)) /
            1000
        ).toFixed(2)
      ),
      Number(
        (
          ((map.stats.allDamagePer10 ?? 0) +
            (stats.aggregated.allDamagePer10StdDev ?? 0)) /
          1000
        ).toFixed(2)
      ),
    ],
  }));

  const lineChartConfig: ChartConfig = {
    elimsPer10: {
      label: t("elimsPer10"),
      color: "var(--chart-1)",
    },
    deathsPer10: {
      label: t("deathsPer10"),
      color: "var(--chart-2)",
    },
    damagePer10: {
      label: t("damagePer10K"),
      color: "var(--chart-3)",
    },
  };

  // Prepare data for bar chart (side-by-side comparison for 2 maps) - using per-10 values
  const barChartData =
    viewMode === "two-map" && stats.perMapBreakdown.length === 2
      ? [
          {
            stat: t("elimsPer10"),
            map1: stats.perMapBreakdown[0].stats.eliminationsPer10 ?? 0,
            map2: stats.perMapBreakdown[1].stats.eliminationsPer10 ?? 0,
          },
          {
            stat: t("deathsPer10"),
            map1: stats.perMapBreakdown[0].stats.deathsPer10 ?? 0,
            map2: stats.perMapBreakdown[1].stats.deathsPer10 ?? 0,
          },
          {
            stat: t("damagePer10K"),
            map1: (stats.perMapBreakdown[0].stats.allDamagePer10 ?? 0) / 1000,
            map2: (stats.perMapBreakdown[1].stats.allDamagePer10 ?? 0) / 1000,
          },
          {
            stat: t("healingPer10K"),
            map1:
              (stats.perMapBreakdown[0].stats.healingDealtPer10 ?? 0) / 1000,
            map2:
              (stats.perMapBreakdown[1].stats.healingDealtPer10 ?? 0) / 1000,
          },
          {
            stat: t("blockedPer10K"),
            map1:
              (stats.perMapBreakdown[0].stats.damageBlockedPer10 ?? 0) / 1000,
            map2:
              (stats.perMapBreakdown[1].stats.damageBlockedPer10 ?? 0) / 1000,
          },
        ]
      : [];

  const barChartConfig: ChartConfig =
    viewMode === "two-map" && stats.perMapBreakdown.length === 2
      ? {
          map1: {
            label: `${stats.perMapBreakdown[0].scrimName} - ${stats.perMapBreakdown[0].mapName}`,
            color: "var(--chart-1)",
          },
          map2: {
            label: `${stats.perMapBreakdown[1].scrimName} - ${stats.perMapBreakdown[1].mapName}`,
            color: "var(--chart-2)",
          },
        }
      : {};

  // Prepare data for radar chart (performance profile)
  const radarChartData =
    viewMode === "two-map" && stats.perMapBreakdown?.length === 2
      ? [
          {
            metric: t("elimsPer10Short"),
            map1: Number(
              (stats.perMapBreakdown[0]?.stats.eliminationsPer10 ?? 0).toFixed(
                2
              )
            ),
            map2: Number(
              (stats.perMapBreakdown[1]?.stats.eliminationsPer10 ?? 0).toFixed(
                2
              )
            ),
          },
          {
            metric: t("deathsPer10Short"),
            map1: Number(
              (20 - (stats.perMapBreakdown[0]?.stats.deathsPer10 ?? 0)).toFixed(
                2
              )
            ), // Invert for better visualization
            map2: Number(
              (20 - (stats.perMapBreakdown[1]?.stats.deathsPer10 ?? 0)).toFixed(
                2
              )
            ),
          },
          {
            metric: t("damagePer10Short"),
            map1: Number(
              (
                (stats.perMapBreakdown[0]?.stats.allDamagePer10 ?? 0) / 1000
              ).toFixed(2)
            ),
            map2: Number(
              (
                (stats.perMapBreakdown[1]?.stats.allDamagePer10 ?? 0) / 1000
              ).toFixed(2)
            ),
          },
          {
            metric: t("healingPer10Short"),
            map1: Number(
              (
                (stats.perMapBreakdown[0]?.stats.healingDealtPer10 ?? 0) / 1000
              ).toFixed(2)
            ),
            map2: Number(
              (
                (stats.perMapBreakdown[1]?.stats.healingDealtPer10 ?? 0) / 1000
              ).toFixed(2)
            ),
          },
          {
            metric: t("mitigatedPer10Short"),
            map1: Number(
              (
                (stats.perMapBreakdown[0]?.stats.damageBlockedPer10 ?? 0) / 1000
              ).toFixed(2)
            ),
            map2: Number(
              (
                (stats.perMapBreakdown[1]?.stats.damageBlockedPer10 ?? 0) / 1000
              ).toFixed(2)
            ),
          },
        ]
      : [
          {
            metric: t("elimsPer10Short"),
            value: Number(
              (stats.aggregated?.eliminationsPer10 ?? 0).toFixed(2)
            ),
          },
          {
            metric: t("deathsPer10Short"),
            value: Number(
              (20 - (stats.aggregated?.deathsPer10 ?? 0)).toFixed(2)
            ), // Invert
          },
          {
            metric: t("damagePer10Short"),
            value: Number(
              ((stats.aggregated?.allDamagePer10 ?? 0) / 1000).toFixed(2)
            ),
          },
          {
            metric: t("healingPer10Short"),
            value: Number(
              ((stats.aggregated?.healingDealtPer10 ?? 0) / 1000).toFixed(2)
            ),
          },
          {
            metric: t("mitigatedPer10Short"),
            value: Number(
              ((stats.aggregated?.damageBlockedPer10 ?? 0) / 1000).toFixed(2)
            ),
          },
        ];

  const radarChartConfig: ChartConfig =
    viewMode === "two-map" && stats.perMapBreakdown?.length === 2
      ? {
          map1: {
            label: `${stats.perMapBreakdown[0].scrimName} - ${stats.perMapBreakdown[0].mapName}`,
            color: "var(--chart-1)",
          },
          map2: {
            label: `${stats.perMapBreakdown[1].scrimName} - ${stats.perMapBreakdown[1].mapName}`,
            color: "var(--chart-2)",
          },
        }
      : {
          value: {
            label: t("averagePerformance"),
            color: "var(--chart-1)",
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
                  content={(props) => (
                    <CustomLineChartTooltip
                      {...props}
                      config={lineChartConfig}
                    />
                  )}
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Line
                  type="monotone"
                  dataKey="elimsPer10"
                  stroke="var(--color-elimsPer10)"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                >
                  <ErrorBar
                    dataKey="elimsPer10Error"
                    stroke="var(--color-elimsPer10)"
                    strokeWidth={1.5}
                    width={8}
                  />
                </Line>
                <Line
                  type="monotone"
                  dataKey="deathsPer10"
                  stroke="var(--color-deathsPer10)"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                >
                  <ErrorBar
                    dataKey="deathsPer10Error"
                    stroke="var(--color-deathsPer10)"
                    strokeWidth={1.5}
                    width={8}
                  />
                </Line>
                <Line
                  type="monotone"
                  dataKey="damagePer10"
                  stroke="var(--color-damagePer10)"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                >
                  <ErrorBar
                    dataKey="damagePer10Error"
                    stroke="var(--color-damagePer10)"
                    strokeWidth={1.5}
                    width={8}
                  />
                </Line>
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
      {radarChartData && radarChartData.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("performanceProfile")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={radarChartConfig}
              className="mx-auto aspect-square max-h-[400px]"
            >
              <RadarChart data={radarChartData}>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="line" />}
                />
                <PolarAngleAxis dataKey="metric" />
                <PolarGrid radialLines={false} />
                <PolarRadiusAxis />
                {viewMode === "two-map" &&
                stats.perMapBreakdown?.length === 2 ? (
                  <>
                    <Radar
                      dataKey="map1"
                      fill="var(--color-map1)"
                      fillOpacity={0}
                      stroke="var(--color-map1)"
                      strokeWidth={2}
                    />
                    <Radar
                      dataKey="map2"
                      fill="var(--color-map2)"
                      fillOpacity={0}
                      stroke="var(--color-map2)"
                      strokeWidth={2}
                    />
                  </>
                ) : (
                  <Radar
                    dataKey="value"
                    fill="var(--color-value)"
                    fillOpacity={0}
                    stroke="var(--color-value)"
                    strokeWidth={2}
                  />
                )}
              </RadarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      ) : null}

      {/* Impact Metrics Cards - Normalized Stats Only */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              {t("firstPickPercentage")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {stats.aggregated.firstPickPercentage.toFixed(1)}%
            </div>
            <p className="text-muted-foreground text-xs">
              {stats.aggregated.firstPicksPer10.toFixed(1)} {t("per10")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              {t("firstDeathPercentage")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {stats.aggregated.firstDeathPercentage.toFixed(1)}%
            </div>
            <p className="text-muted-foreground text-xs">
              {stats.aggregated.firstDeathsPer10.toFixed(1)} {t("per10")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              {t("killsPerUltimate")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {stats.aggregated.killsPerUltimate.toFixed(2)}
            </div>
            <p className="text-muted-foreground text-xs">{t("avgUltImpact")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              {t("soloKillsPer10")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {stats.aggregated.soloKillsPer10.toFixed(1)}
            </div>
            <p className="text-muted-foreground text-xs">
              {t("individualKills")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              {t("damageTakenPer10")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {stats.aggregated.damageTakenPer10.toLocaleString()}
            </div>
            <p className="text-muted-foreground text-xs">
              {t("damageReceived")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              {t("healingReceivedPer10")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {stats.aggregated.healingReceivedPer10.toLocaleString()}
            </div>
            <p className="text-muted-foreground text-xs">
              {t("supportReceived")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              {t("fightReversalPercentage")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {stats.aggregated.fightReversalPercentage.toFixed(1)}%
            </div>
            <p className="text-muted-foreground text-xs">{t("clutchPlays")}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
