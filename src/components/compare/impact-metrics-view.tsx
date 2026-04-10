"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { ComparisonStats, TrendsAnalysis } from "@/data/comparison/types";
import {
  Award,
  Crosshair,
  Flame,
  Shield,
  Sparkles,
  Star,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";
import { useTranslations } from "next-intl";

type ImpactMetricsViewProps = {
  stats: ComparisonStats[];
};

type ImpactInsight = {
  type: "strength" | "neutral" | "consideration";
  title: string;
  description: string;
  metric?: string;
  icon: typeof Star;
};

type TrendDirection = "up" | "down" | "stable" | null;

function getTrendDirection(
  metricName: string,
  trends?: TrendsAnalysis
): { direction: TrendDirection; changePercentage: number } {
  if (!trends) {
    return { direction: null, changePercentage: 0 };
  }

  const improving = trends.improvingMetrics.find((m) =>
    m.metric.toLowerCase().includes(metricName.toLowerCase())
  );
  if (improving) {
    return { direction: "up", changePercentage: improving.changePercentage };
  }

  const declining = trends.decliningMetrics.find((m) =>
    m.metric.toLowerCase().includes(metricName.toLowerCase())
  );
  if (declining) {
    return { direction: "down", changePercentage: declining.changePercentage };
  }

  return { direction: "stable", changePercentage: 0 };
}

function TrendIndicator({
  direction,
  changePercentage,
}: {
  direction: TrendDirection;
  changePercentage: number;
}) {
  if (direction === null || direction === "stable") {
    return null;
  }

  const isPositive = direction === "up";
  const Icon = isPositive ? TrendingUp : TrendingUp;

  return (
    <div
      className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${
        isPositive
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
          : "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
      }`}
    >
      <Icon
        className={`h-3 w-3 ${isPositive ? "" : "rotate-180"}`}
        strokeWidth={2.5}
      />
      <span>{Math.abs(changePercentage).toFixed(0)}%</span>
    </div>
  );
}

function getConsistencyLevel(score: number): {
  label: string;
  color: string;
  bgColor: string;
} {
  if (score >= 75) {
    return {
      label: "High Consistency",
      color: "text-emerald-700 dark:text-emerald-400",
      bgColor: "bg-emerald-100 dark:bg-emerald-950/40",
    };
  }
  if (score >= 50) {
    return {
      label: "Moderate Consistency",
      color: "text-amber-700 dark:text-amber-400",
      bgColor: "bg-amber-100 dark:bg-amber-950/40",
    };
  }
  return {
    label: "Variable Performance",
    color: "text-rose-700 dark:text-rose-400",
    bgColor: "bg-rose-100 dark:bg-rose-950/40",
  };
}

function generateInsights(stat: ComparisonStats): ImpactInsight[] {
  const insights: ImpactInsight[] = [];
  const { aggregated } = stat;

  // First Pick insights
  if (aggregated.firstPickPercentage > 30) {
    insights.push({
      type: "strength",
      title: "Strong Fight Initiator",
      description: `Gets the opening kill in ${aggregated.firstPickPercentage.toFixed(1)}% of fights. This player excels at creating early advantages.`,
      metric: `${aggregated.firstPickPercentage.toFixed(1)}%`,
      icon: Crosshair,
    });
  }

  // Consistency insights
  if (aggregated.consistencyScore > 70) {
    insights.push({
      type: "strength",
      title: "Reliable Performer",
      description:
        "Maintains consistent performance across different map types and matchups. Low variance in key metrics.",
      metric: `${aggregated.consistencyScore.toFixed(0)}/100`,
      icon: TrendingUp,
    });
  } else if (aggregated.consistencyScore < 50) {
    insights.push({
      type: "consideration",
      title: "Context-Dependent Performance",
      description:
        "Performance varies significantly across maps. Consider map/matchup context when evaluating.",
      metric: `${aggregated.consistencyScore.toFixed(0)}/100`,
      icon: TrendingUp,
    });
  }

  // Ultimate efficiency
  if (aggregated.killsPerUltimate > 2.5) {
    insights.push({
      type: "strength",
      title: "High Ultimate Impact",
      description: `Averages ${aggregated.killsPerUltimate.toFixed(1)} eliminations per ultimate. Makes ult usage count.`,
      metric: `${aggregated.killsPerUltimate.toFixed(1)} K/Ult`,
      icon: Zap,
    });
  }

  // Fight reversal
  if (aggregated.fightReversalPercentage > 20) {
    insights.push({
      type: "strength",
      title: "Clutch Performer",
      description: `Turns around ${aggregated.fightReversalPercentage.toFixed(1)}% of losing fights. Strong under pressure.`,
      metric: `${aggregated.fightReversalPercentage.toFixed(1)}%`,
      icon: Shield,
    });
  }

  // MVP performance
  if (aggregated.mapMvpRate > 50) {
    insights.push({
      type: "strength",
      title: "Consistent MVP",
      description: `Named map MVP in ${aggregated.mapMvpRate.toFixed(1)}% of matches. High overall impact.`,
      metric: `${aggregated.mapMvpRate.toFixed(1)}%`,
      icon: Trophy,
    });
  }

  // Fleta Deadlift (team impact)
  if (aggregated.fletaDeadliftPercentage > 30) {
    insights.push({
      type: "strength",
      title: "High Team Impact",
      description: `Contributes ${aggregated.fletaDeadliftPercentage.toFixed(1)}% of team eliminations. Key damage dealer.`,
      metric: `${aggregated.fletaDeadliftPercentage.toFixed(1)}%`,
      icon: Flame,
    });
  }

  // First death consideration
  if (aggregated.firstDeathPercentage > 25) {
    insights.push({
      type: "consideration",
      title: "Dies Early Frequently",
      description: `First to die in ${aggregated.firstDeathPercentage.toFixed(1)}% of fights. Consider positioning and survival.`,
      metric: `${aggregated.firstDeathPercentage.toFixed(1)}%`,
      icon: Crosshair,
    });
  }

  return insights;
}

export function ImpactMetricsView({ stats }: ImpactMetricsViewProps) {
  const t = useTranslations("comparePage.impactMetrics");

  return (
    <div className="space-y-6">
      {stats.map((playerStat) => {
        const insights = generateInsights(playerStat);
        const strengthInsights = insights.filter((i) => i.type === "strength");
        const considerationInsights = insights.filter(
          (i) => i.type === "consideration"
        );
        const consistency = getConsistencyLevel(
          playerStat.aggregated.consistencyScore
        );

        return (
          <Card
            key={playerStat.playerName}
            className="border-primary/20 from-primary/5 overflow-hidden bg-gradient-to-br via-transparent to-transparent"
          >
            <CardHeader className="from-primary/10 border-b bg-gradient-to-r to-transparent pb-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-3xl font-bold tracking-tight">
                    {playerStat.playerName}
                  </CardTitle>
                  <div className="mt-2 flex items-center gap-3">
                    <p className="text-muted-foreground text-sm">
                      {t("subtitle", { count: playerStat.mapCount })}
                    </p>
                    {playerStat.trends && (
                      <Badge variant="outline" className="gap-1 text-xs">
                        <TrendingUp className="h-3 w-3" />
                        Trends Available
                      </Badge>
                    )}
                  </div>
                </div>
                <div className={`rounded-2xl px-6 py-3 ${consistency.bgColor}`}>
                  <p className="text-xs font-medium tracking-wider uppercase opacity-80">
                    {t("consistency")}
                  </p>
                  <p className={`text-2xl font-bold ${consistency.color}`}>
                    {consistency.label}
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-8 pt-6">
              {/* One-glance summary */}
              <div className="from-primary/5 grid gap-4 rounded-2xl border bg-gradient-to-br to-transparent p-6 md:grid-cols-3">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="bg-primary/10 rounded-lg p-2">
                        <Award className="text-primary h-5 w-5" />
                      </div>
                      <p className="text-muted-foreground text-sm font-medium">
                        {t("stats.mvpScore")}
                      </p>
                    </div>
                    <TrendIndicator
                      {...getTrendDirection("mvp", playerStat.trends)}
                    />
                  </div>
                  <p className="font-mono text-3xl font-bold tabular-nums">
                    {playerStat.aggregated.mvpScore.toFixed(1)}
                  </p>
                  <Progress
                    value={(playerStat.aggregated.mvpScore / 15) * 100}
                    className="h-2"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="rounded-lg bg-emerald-100 p-2 dark:bg-emerald-950/40">
                        <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <p className="text-muted-foreground text-sm font-medium">
                        {t("stats.firstPickRate")}
                      </p>
                    </div>
                    <TrendIndicator
                      {...getTrendDirection("first pick", playerStat.trends)}
                    />
                  </div>
                  <p className="font-mono text-3xl font-bold tabular-nums">
                    {playerStat.aggregated.firstPickPercentage.toFixed(1)}%
                  </p>
                  <Progress
                    value={playerStat.aggregated.firstPickPercentage}
                    className="h-2"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="rounded-lg bg-violet-100 p-2 dark:bg-violet-950/40">
                        <Zap className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                      </div>
                      <p className="text-muted-foreground text-sm font-medium">
                        {t("stats.killsPerUlt")}
                      </p>
                    </div>
                    <TrendIndicator
                      {...getTrendDirection("ultimate", playerStat.trends)}
                    />
                  </div>
                  <p className="font-mono text-3xl font-bold tabular-nums">
                    {playerStat.aggregated.killsPerUltimate.toFixed(1)}
                  </p>
                  <Progress
                    value={(playerStat.aggregated.killsPerUltimate / 5) * 100}
                    className="h-2"
                  />
                </div>
              </div>

              {/* Key strengths */}
              {strengthInsights.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-amber-500" />
                    <h3 className="text-lg font-semibold">
                      {t("keyStrengths")}
                    </h3>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {strengthInsights.map((insight) => {
                      const Icon = insight.icon;
                      return (
                        <div
                          key={insight.title}
                          className="group relative overflow-hidden rounded-xl border bg-gradient-to-br from-emerald-50/50 to-transparent p-4 transition-all hover:shadow-md dark:from-emerald-950/20"
                        >
                          <div className="flex items-start gap-3">
                            <div className="rounded-lg bg-emerald-100 p-2 dark:bg-emerald-950/40">
                              <Icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center justify-between">
                                <h4 className="font-semibold">
                                  {insight.title}
                                </h4>
                                {insight.metric && (
                                  <Badge
                                    variant="secondary"
                                    className="bg-emerald-100 font-mono dark:bg-emerald-950/40"
                                  >
                                    {insight.metric}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-muted-foreground text-sm leading-relaxed">
                                {insight.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Development areas */}
              {considerationInsights.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-amber-500" />
                    <h3 className="text-lg font-semibold">
                      {t("developmentAreas")}
                    </h3>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {considerationInsights.map((insight) => {
                      const Icon = insight.icon;
                      return (
                        <div
                          key={insight.title}
                          className="group relative overflow-hidden rounded-xl border bg-gradient-to-br from-amber-50/50 to-transparent p-4 transition-all hover:shadow-md dark:from-amber-950/20"
                        >
                          <div className="flex items-start gap-3">
                            <div className="rounded-lg bg-amber-100 p-2 dark:bg-amber-950/40">
                              <Icon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center justify-between">
                                <h4 className="font-semibold">
                                  {insight.title}
                                </h4>
                                {insight.metric && (
                                  <Badge
                                    variant="secondary"
                                    className="bg-amber-100 font-mono dark:bg-amber-950/40"
                                  >
                                    {insight.metric}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-muted-foreground text-sm leading-relaxed">
                                {insight.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Detailed impact metrics grid */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">
                  {t("detailedMetrics")}
                </h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {[
                    {
                      label: t("stats.firstPicks"),
                      value: playerStat.aggregated.firstPickPercentage,
                      valuePer10: playerStat.aggregated.firstPicksPer10,
                      format: "percentage" as const,
                      color: "emerald",
                      icon: Crosshair,
                    },
                    {
                      label: t("stats.firstDeaths"),
                      value: playerStat.aggregated.firstDeathPercentage,
                      valuePer10: playerStat.aggregated.firstDeathsPer10,
                      format: "percentage" as const,
                      color: "rose",
                      icon: Shield,
                      reverse: true,
                    },
                    {
                      label: t("stats.fightReversal"),
                      value: playerStat.aggregated.fightReversalPercentage,
                      format: "percentage" as const,
                      color: "blue",
                      icon: Shield,
                    },
                    {
                      label: t("stats.fletaDeadlift"),
                      value: playerStat.aggregated.fletaDeadliftPercentage,
                      format: "percentage" as const,
                      color: "orange",
                      icon: Flame,
                    },
                    {
                      label: t("stats.mapMvpRate"),
                      value: playerStat.aggregated.mapMvpRate,
                      format: "percentage" as const,
                      color: "amber",
                      icon: Trophy,
                    },
                  ].map((metric) => {
                    const trend = getTrendDirection(
                      metric.label,
                      playerStat.trends
                    );
                    return (
                      <div
                        key={metric.label}
                        className={`rounded-xl border p-4 transition-all hover:shadow-md bg-${metric.color}-50/30 dark:bg-${metric.color}-950/10 hover:bg-${metric.color}-50/50 dark:hover:bg-${metric.color}-950/20`}
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <div
                            className={`rounded-lg p-2 bg-${metric.color}-100 dark:bg-${metric.color}-950/40`}
                          >
                            <metric.icon
                              className={`h-4 w-4 text-${metric.color}-600 dark:text-${metric.color}-400`}
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <TrendIndicator
                              direction={trend.direction}
                              changePercentage={trend.changePercentage}
                            />
                            {metric.valuePer10 && (
                              <Badge
                                variant="outline"
                                className="font-mono text-xs"
                              >
                                {metric.valuePer10.toFixed(1)}/10
                              </Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">
                          {metric.label}
                        </p>
                        <p className="font-mono text-2xl font-bold tabular-nums">
                          {metric.format === "percentage"
                            ? `${metric.value.toFixed(1)}%`
                            : metric.value.toFixed(1)}
                        </p>
                        <Progress
                          value={
                            metric.reverse ? 100 - metric.value : metric.value
                          }
                          className={`mt-3 h-1.5 bg-${metric.color}-100 dark:bg-${metric.color}-950/40`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
