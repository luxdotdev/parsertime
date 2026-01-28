"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ComparisonStats } from "@/data/comparison-dto";
import { Activity, Target, TrendingUp, Zap } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  ErrorBar,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ConsistencyViewProps = {
  stats: ComparisonStats;
};

function getConsistencyLevel(score: number): {
  label: string;
  color: string;
  icon: typeof Activity;
  description: string;
} {
  if (score >= 85) {
    return {
      label: "Highly Consistent",
      color: "text-emerald-600 dark:text-emerald-400",
      icon: Target,
      description: "Rock solid performance across all maps",
    };
  }
  if (score >= 70) {
    return {
      label: "Consistent",
      color: "text-green-600 dark:text-green-400",
      icon: TrendingUp,
      description: "Reliable performance with minor variance",
    };
  }
  if (score >= 55) {
    return {
      label: "Moderately Consistent",
      color: "text-amber-600 dark:text-amber-400",
      icon: Activity,
      description: "Performance varies based on context",
    };
  }
  return {
    label: "Variable Performance",
    color: "text-rose-600 dark:text-rose-400",
    icon: Zap,
    description: "Significant variation across different maps",
  };
}

export function ConsistencyView({ stats }: ConsistencyViewProps) {
  const { aggregated, perMapBreakdown } = stats;

  const consistency = getConsistencyLevel(aggregated.consistencyScore);
  const ConsistencyIcon = consistency.icon;

  const varianceData = [
    {
      metric: "Eliminations",
      mean: Number(aggregated.eliminationsPer10.toFixed(1)),
      stdDev: Number(aggregated.eliminationsPer10StdDev.toFixed(1)),
      lower: Number(
        Math.max(
          0,
          aggregated.eliminationsPer10 - aggregated.eliminationsPer10StdDev
        ).toFixed(1)
      ),
      upper: Number(
        (
          aggregated.eliminationsPer10 + aggregated.eliminationsPer10StdDev
        ).toFixed(1)
      ),
      cv: aggregated.eliminationsPer10
        ? (
            (aggregated.eliminationsPer10StdDev /
              aggregated.eliminationsPer10) *
            100
          ).toFixed(1)
        : "0.0",
    },
    {
      metric: "Deaths",
      mean: Number(aggregated.deathsPer10.toFixed(1)),
      stdDev: Number(aggregated.deathsPer10StdDev.toFixed(1)),
      lower: Number(
        Math.max(
          0,
          aggregated.deathsPer10 - aggregated.deathsPer10StdDev
        ).toFixed(1)
      ),
      upper: Number(
        (aggregated.deathsPer10 + aggregated.deathsPer10StdDev).toFixed(1)
      ),
      cv: aggregated.deathsPer10
        ? (
            (aggregated.deathsPer10StdDev / aggregated.deathsPer10) *
            100
          ).toFixed(1)
        : "0.0",
    },
    {
      metric: "Damage",
      mean: Number((aggregated.allDamagePer10 / 1000).toFixed(1)),
      stdDev: Number((aggregated.allDamagePer10StdDev / 1000).toFixed(1)),
      lower: Number(
        Math.max(
          0,
          (aggregated.allDamagePer10 - aggregated.allDamagePer10StdDev) / 1000
        ).toFixed(1)
      ),
      upper: Number(
        (
          (aggregated.allDamagePer10 + aggregated.allDamagePer10StdDev) /
          1000
        ).toFixed(1)
      ),
      cv: aggregated.allDamagePer10
        ? (
            (aggregated.allDamagePer10StdDev / aggregated.allDamagePer10) *
            100
          ).toFixed(1)
        : "0.0",
    },
    {
      metric: "Healing",
      mean: Number((aggregated.healingDealtPer10 / 1000).toFixed(1)),
      stdDev: Number((aggregated.healingDealtPer10StdDev / 1000).toFixed(1)),
      lower: Number(
        Math.max(
          0,
          (aggregated.healingDealtPer10 - aggregated.healingDealtPer10StdDev) /
            1000
        ).toFixed(1)
      ),
      upper: Number(
        (
          (aggregated.healingDealtPer10 + aggregated.healingDealtPer10StdDev) /
          1000
        ).toFixed(1)
      ),
      cv: aggregated.healingDealtPer10
        ? (
            (aggregated.healingDealtPer10StdDev /
              aggregated.healingDealtPer10) *
            100
          ).toFixed(1)
        : "0.0",
    },
  ].filter((d) => d.mean > 0);

  // Calculate the range width for the bar chart (this is what we'll display)
  const varianceChartData = varianceData.map((item) => ({
    metric: item.metric,
    mean: item.mean,
    stdDev: item.stdDev,
    lower: item.lower,
    upper: item.upper,
    cv: item.cv,
    // For stacked bars: start at lower bound, then show the range (2 * stdDev)
    rangeWidth: Number((item.stdDev * 2).toFixed(1)),
    // Error bar format: [lowerError, upperError] as array
    errorBar: [item.stdDev, item.stdDev],
  }));

  const perMapData = perMapBreakdown.map((map, idx) => ({
    name: `Map ${idx + 1}`,
    fullName: `${map.scrimName} - ${map.mapName}`,
    elimsPer10: Number((map.stats.eliminationsPer10 ?? 0).toFixed(1)),
    deathsPer10: Number((map.stats.deathsPer10 ?? 0).toFixed(1)),
    damagePer10: Number(((map.stats.allDamagePer10 ?? 0) / 1000).toFixed(1)),
    healingPer10: Number(
      ((map.stats.healing_dealt / map.stats.hero_time_played) * 600) / 1000
    ).toFixed(1),
  }));

  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden border-2">
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
            backgroundSize: "32px 32px",
          }}
        />

        <CardHeader className="relative">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="flex items-center gap-3 text-2xl font-bold tracking-tight">
                <div
                  className={`rounded-lg bg-gradient-to-br p-2 ${
                    aggregated.consistencyScore >= 85
                      ? "from-emerald-500/10 to-green-500/10"
                      : aggregated.consistencyScore >= 70
                        ? "from-green-500/10 to-lime-500/10"
                        : aggregated.consistencyScore >= 55
                          ? "from-amber-500/10 to-yellow-500/10"
                          : "from-rose-500/10 to-orange-500/10"
                  }`}
                >
                  <ConsistencyIcon className={`h-6 w-6 ${consistency.color}`} />
                </div>
                Performance Consistency
              </CardTitle>
              <p className="text-muted-foreground max-w-2xl text-sm">
                Measures how reliable performance is across different maps and
                contexts. Lower variance indicates consistent, dependable play.
              </p>
            </div>

            <div className="text-right">
              <div className="flex flex-col items-end gap-1">
                <span className="text-muted-foreground text-sm font-medium">
                  Consistency Score
                </span>
                <div
                  className={`text-5xl font-bold tracking-tight tabular-nums ${consistency.color}`}
                >
                  {aggregated.consistencyScore.toFixed(0)}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${consistency.color} bg-current/10`}
                  >
                    {consistency.label}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-muted/50 mt-4 rounded-lg border p-4">
            <p className="text-muted-foreground text-sm italic">
              {consistency.description}
            </p>
          </div>
        </CardHeader>

        <CardContent className="relative space-y-6">
          <div>
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <div className="bg-primary h-1 w-1 rounded-full" />
              Mean ± Standard Deviation
            </h3>

            {/* Vertical bar chart with error bars */}
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={varianceChartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border)"
                    opacity={0.3}
                  />
                  <XAxis
                    dataKey="metric"
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                  />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.[0]) return null;
                      const data = payload[0]
                        .payload as (typeof varianceChartData)[0];
                      return (
                        <div className="bg-background rounded-lg border p-3 shadow-lg">
                          <div className="space-y-2">
                            <div className="text-base font-semibold">
                              {data.metric} per 10
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-3 text-sm">
                                <span className="text-muted-foreground">
                                  Mean:
                                </span>
                                <span className="font-mono font-semibold">
                                  {data.mean.toFixed(1)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-3 text-sm">
                                <span className="text-muted-foreground">
                                  Std Dev:
                                </span>
                                <span className="font-mono">
                                  ±{data.stdDev.toFixed(1)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-3 text-sm">
                                <span className="text-muted-foreground">
                                  Range:
                                </span>
                                <span className="font-mono text-xs">
                                  {data.lower.toFixed(1)} –{" "}
                                  {data.upper.toFixed(1)}
                                </span>
                              </div>
                              <div className="mt-2 border-t pt-2">
                                <div className="flex items-center justify-between gap-3 text-sm">
                                  <span className="text-muted-foreground">
                                    CV:
                                  </span>
                                  <span className="font-mono">{data.cv}%</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="mean" radius={[4, 4, 0, 0]}>
                    {varianceChartData.map((entry) => (
                      <Cell
                        key={entry.metric}
                        fill={
                          entry.metric === "Eliminations"
                            ? "var(--chart-1)"
                            : entry.metric === "Deaths"
                              ? "var(--chart-2)"
                              : entry.metric === "Damage"
                                ? "var(--chart-3)"
                                : "var(--chart-4)"
                        }
                      />
                    ))}
                    <ErrorBar
                      dataKey="errorBar"
                      width={8}
                      strokeWidth={2.5}
                      stroke="var(--foreground)"
                      opacity={0.7}
                    />
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {varianceData.map((item) => (
              <Card
                key={item.metric}
                className="bg-card/50 border backdrop-blur-sm"
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-muted-foreground text-sm font-medium">
                    {item.metric} per 10
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold tabular-nums">
                      {item.mean}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      ± {item.stdDev}
                    </span>
                  </div>
                  <div className="text-muted-foreground space-y-0.5 text-xs">
                    <div>
                      Range: {item.lower} - {item.upper}
                    </div>
                    <div>Variation: {item.cv}%</div>
                  </div>
                  <div className="pt-2">
                    <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500 transition-all duration-300"
                        style={{
                          width: `${Math.min(100, parseFloat(item.cv) * 2)}%`,
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {perMapBreakdown.length >= 3 && (
            <div>
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <div className="bg-primary h-1 w-1 rounded-full" />
                Performance Across Maps
              </h3>

              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={perMapData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                      opacity={0.3}
                    />
                    <XAxis
                      dataKey="name"
                      stroke="var(--muted-foreground)"
                      fontSize={12}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="var(--muted-foreground)"
                      fontSize={12}
                      tickLine={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.[0]) return null;
                        const data = payload[0]
                          .payload as (typeof perMapData)[0];
                        return (
                          <div className="bg-background rounded-lg border p-2 shadow-sm">
                            <div className="space-y-1">
                              <div className="font-semibold">
                                {data.fullName}
                              </div>
                              {payload.map((entry) => (
                                <div
                                  key={entry.dataKey}
                                  className="text-muted-foreground text-xs"
                                >
                                  {entry.name}: {entry.value}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Bar
                      dataKey="elimsPer10"
                      fill="var(--chart-1)"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="deathsPer10"
                      fill="var(--chart-2)"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="damagePer10"
                      fill="var(--chart-3)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="bg-muted/30 rounded-lg border p-4">
            <h4 className="mb-2 text-sm font-semibold">
              Understanding Consistency Metrics
            </h4>
            <div className="text-muted-foreground space-y-2 text-sm">
              <p>
                <strong className="text-foreground">Standard Deviation:</strong>{" "}
                Measures how spread out performance is. Lower values = more
                consistent.
              </p>
              <p>
                <strong className="text-foreground">
                  Coefficient of Variation:
                </strong>{" "}
                Normalized measure of dispersion. Allows comparison across
                different scales.
              </p>
              <p>
                <strong className="text-foreground">Consistency Score:</strong>{" "}
                Overall reliability metric (0-100). Higher scores indicate
                dependable, steady performance.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
