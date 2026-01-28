"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  AggregatedStats,
  ComparisonStats,
  TrendsAnalysis,
} from "@/data/comparison-dto";
import {
  Activity,
  Award,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  Filter,
  Shield,
  Sparkles,
  Sword,
  Target,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

type DetailedStatsViewProps = {
  stats: ComparisonStats[];
};

type StatCategory =
  | "combat"
  | "damage"
  | "support"
  | "defense"
  | "assists"
  | "ultimate"
  | "impact"
  | "consistency";

type StatRow = {
  label: string;
  key: keyof AggregatedStats;
  format: "number" | "percentage" | "time" | "ratio" | "per10";
  category: StatCategory;
  priority?: boolean;
  tooltip?: string;
};

function formatStatValue(
  value: number,
  format: "number" | "percentage" | "time" | "ratio" | "per10"
): string {
  if (format === "time") {
    const minutes = Math.floor(value / 60);
    const seconds = Math.floor(value % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }
  if (format === "percentage") {
    return `${value.toFixed(1)}%`;
  }
  if (format === "ratio") {
    return value.toFixed(2);
  }
  if (format === "per10") {
    return value.toFixed(1);
  }
  return value.toLocaleString();
}

function getCategoryIcon(category: StatCategory) {
  switch (category) {
    case "combat":
      return Sword;
    case "damage":
      return Target;
    case "support":
      return Sparkles;
    case "defense":
      return Shield;
    case "assists":
      return Activity;
    case "ultimate":
      return Zap;
    case "impact":
      return Award;
    case "consistency":
      return TrendingUp;
    default:
      return Eye;
  }
}

function getCategoryColor(category: StatCategory): string {
  switch (category) {
    case "combat":
      return "rose";
    case "damage":
      return "orange";
    case "support":
      return "emerald";
    case "defense":
      return "blue";
    case "assists":
      return "purple";
    case "ultimate":
      return "violet";
    case "impact":
      return "amber";
    case "consistency":
      return "cyan";
    default:
      return "gray";
  }
}

function getTrendForMetric(
  metricKey: string,
  trends?: TrendsAnalysis
): { isImproving: boolean; changePercentage: number } | null {
  if (!trends) return null;

  // Map stat keys to their corresponding trend metric names
  const metricNameMap: Record<string, string> = {
    eliminationsPer10: "Eliminations per 10",
    deathsPer10: "Deaths per 10",
    heroDamagePer10: "Damage Dealt per 10",
    damageTakenPer10: "Damage Taken per 10",
    firstDeathPercentage: "First Death %",
    firstPickPercentage: "First Pick %",
    mvpScore: "MVP Score",
    fightReversalPercentage: "Fight Reversal %",
    fletaDeadliftPercentage: "Fleta Deadlift %",
    killsPerUltimate: "Kills per Ultimate",
  };

  const trendMetricName = metricNameMap[metricKey];
  if (!trendMetricName) return null;

  const improving = trends.improvingMetrics.find(
    (m) => m.metric === trendMetricName
  );
  if (improving) {
    return { isImproving: true, changePercentage: improving.changePercentage };
  }

  const declining = trends.decliningMetrics.find(
    (m) => m.metric === trendMetricName
  );
  if (declining) {
    return { isImproving: false, changePercentage: declining.changePercentage };
  }

  return null;
}

export function DetailedStatsView({ stats }: DetailedStatsViewProps) {
  const t = useTranslations("comparePage.detailedStats");
  const [selectedCategory, setSelectedCategory] = useState<
    StatCategory | "all"
  >("all");
  const [sortBy, setSortBy] = useState<{
    playerIndex: number;
    direction: "asc" | "desc";
  } | null>(null);

  const statDefinitions: StatRow[] = [
    // Combat
    {
      label: t("stats.eliminationsPer10"),
      key: "eliminationsPer10",
      format: "per10",
      category: "combat",
      priority: true,
    },
    {
      label: t("stats.finalBlowsPer10"),
      key: "finalBlowsPer10",
      format: "per10",
      category: "combat",
      priority: true,
    },
    {
      label: t("stats.soloKillsPer10"),
      key: "soloKillsPer10",
      format: "per10",
      category: "combat",
      priority: true,
    },
    {
      label: t("stats.deathsPer10"),
      key: "deathsPer10",
      format: "per10",
      category: "combat",
      priority: true,
    },

    // Damage
    {
      label: t("stats.allDamagePer10"),
      key: "allDamagePer10",
      format: "per10",
      category: "damage",
    },
    {
      label: t("stats.heroDamagePer10"),
      key: "heroDamagePer10",
      format: "per10",
      category: "damage",
    },
    {
      label: t("stats.barrierDamagePer10"),
      key: "barrierDamagePer10",
      format: "per10",
      category: "damage",
    },

    // Support
    {
      label: t("stats.healingDealtPer10"),
      key: "healingDealtPer10",
      format: "per10",
      category: "support",
    },
    {
      label: t("stats.healingReceivedPer10"),
      key: "healingReceivedPer10",
      format: "per10",
      category: "support",
      priority: true,
    },
    {
      label: t("stats.selfHealingPer10"),
      key: "selfHealingPer10",
      format: "per10",
      category: "support",
    },

    // Defense
    {
      label: t("stats.damageTakenPer10"),
      key: "damageTakenPer10",
      format: "per10",
      category: "defense",
      priority: true,
    },
    {
      label: t("stats.damageBlockedPer10"),
      key: "damageBlockedPer10",
      format: "per10",
      category: "defense",
    },

    // Assists
    {
      label: t("stats.offensiveAssistsPer10"),
      key: "offensiveAssistsPer10",
      format: "per10",
      category: "assists",
    },
    {
      label: t("stats.defensiveAssistsPer10"),
      key: "defensiveAssistsPer10",
      format: "per10",
      category: "assists",
    },

    // Ultimate
    {
      label: t("stats.ultimatesEarnedPer10"),
      key: "ultimatesEarnedPer10",
      format: "per10",
      category: "ultimate",
    },
    {
      label: t("stats.ultimatesUsedPer10"),
      key: "ultimatesUsedPer10",
      format: "per10",
      category: "ultimate",
    },
    {
      label: t("stats.averageUltChargeTime"),
      key: "averageUltChargeTime",
      format: "time",
      category: "ultimate",
      priority: true,
    },
    {
      label: t("stats.averageTimeToUseUlt"),
      key: "averageTimeToUseUlt",
      format: "time",
      category: "ultimate",
    },
    {
      label: t("stats.killsPerUltimate"),
      key: "killsPerUltimate",
      format: "ratio",
      category: "ultimate",
      priority: true,
    },
    {
      label: t("stats.averageDroughtTime"),
      key: "averageDroughtTime",
      format: "time",
      category: "ultimate",
    },

    // Impact
    {
      label: t("stats.firstPickPercentage"),
      key: "firstPickPercentage",
      format: "percentage",
      category: "impact",
      priority: true,
    },
    {
      label: t("stats.firstPicksPer10"),
      key: "firstPicksPer10",
      format: "per10",
      category: "impact",
      priority: true,
    },
    {
      label: t("stats.firstDeathPercentage"),
      key: "firstDeathPercentage",
      format: "percentage",
      category: "impact",
      priority: true,
    },
    {
      label: t("stats.firstDeathsPer10"),
      key: "firstDeathsPer10",
      format: "per10",
      category: "impact",
      priority: true,
    },
    {
      label: t("stats.fletaDeadliftPercentage"),
      key: "fletaDeadliftPercentage",
      format: "percentage",
      category: "impact",
    },
    {
      label: t("stats.mvpScore"),
      key: "mvpScore",
      format: "number",
      category: "impact",
    },
    {
      label: t("stats.mapMvpRate"),
      key: "mapMvpRate",
      format: "percentage",
      category: "impact",
    },
    {
      label: t("stats.fightReversalPercentage"),
      key: "fightReversalPercentage",
      format: "percentage",
      category: "impact",
      priority: true,
    },

    // Consistency
    {
      label: t("stats.eliminationsPer10StdDev"),
      key: "eliminationsPer10StdDev",
      format: "number",
      category: "consistency",
    },
    {
      label: t("stats.deathsPer10StdDev"),
      key: "deathsPer10StdDev",
      format: "number",
      category: "consistency",
    },
    {
      label: t("stats.allDamagePer10StdDev"),
      key: "allDamagePer10StdDev",
      format: "number",
      category: "consistency",
    },
    {
      label: t("stats.consistencyScore"),
      key: "consistencyScore",
      format: "number",
      category: "consistency",
    },
  ];

  const filteredStats =
    selectedCategory === "all"
      ? statDefinitions
      : statDefinitions.filter((stat) => stat.category === selectedCategory);

  const sortedStats = sortBy
    ? [...filteredStats].sort((a, b) => {
        const aValue = stats[sortBy.playerIndex].aggregated[a.key];
        const bValue = stats[sortBy.playerIndex].aggregated[b.key];
        return sortBy.direction === "asc" ? aValue - bValue : bValue - aValue;
      })
    : filteredStats;

  function handleExportCSV() {
    const headers = ["Stat", ...stats.map((s) => s.playerName)];
    const rows = filteredStats.map((stat) => [
      stat.label,
      ...stats.map((s) => formatStatValue(s.aggregated[stat.key], stat.format)),
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "comparison-stats.csv";
    a.click();
  }

  const categories: { id: StatCategory | "all"; labelKey: string }[] = [
    { id: "all", labelKey: "categories.all" },
    { id: "combat", labelKey: "categories.combat" },
    { id: "damage", labelKey: "categories.damage" },
    { id: "support", labelKey: "categories.support" },
    { id: "defense", labelKey: "categories.defense" },
    { id: "assists", labelKey: "categories.assists" },
    { id: "ultimate", labelKey: "categories.ultimate" },
    { id: "impact", labelKey: "categories.impact" },
    { id: "consistency", labelKey: "categories.consistency" },
  ];

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <Card className="border-primary/20 from-primary/5 bg-gradient-to-br via-transparent to-transparent">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-3xl font-bold tracking-tight">
                {t("title")}
              </CardTitle>
              <p className="text-muted-foreground mt-2 text-sm">
                {t("subtitle")}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {t("exportCsv")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const Icon = cat.id === "all" ? Filter : getCategoryIcon(cat.id);
              const isSelected = selectedCategory === cat.id;

              return (
                <Button
                  key={cat.id}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat.id)}
                  className="gap-2 transition-all"
                >
                  <Icon className="h-4 w-4" />
                  {t(cat.labelKey)}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Stats table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="w-[250px] font-bold">
                    {t("statName")}
                  </TableHead>
                  {stats.map((stat, index) => (
                    <TableHead
                      key={stat.playerName}
                      className="hover:bg-muted/50 cursor-pointer text-center transition-colors select-none"
                      onClick={() =>
                        setSortBy({
                          playerIndex: index,
                          direction:
                            sortBy?.playerIndex === index &&
                            sortBy.direction === "desc"
                              ? "asc"
                              : "desc",
                        })
                      }
                    >
                      <div className="flex items-center justify-center gap-2">
                        <span className="font-bold">{stat.playerName}</span>
                        {sortBy?.playerIndex === index && (
                          <span>
                            {sortBy.direction === "desc" ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronUp className="h-4 w-4" />
                            )}
                          </span>
                        )}
                      </div>
                      <div className="text-muted-foreground text-xs font-normal">
                        {stat.mapCount} {t("maps")}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedStats.map((stat) => {
                  const Icon = getCategoryIcon(stat.category);
                  const color = getCategoryColor(stat.category);
                  const values = stats.map((s) => s.aggregated[stat.key]);
                  const maxValue = Math.max(...values);
                  const minValue = Math.min(...values);

                  return (
                    <TableRow
                      key={stat.key}
                      className={`transition-colors ${
                        stat.priority
                          ? "bg-primary/5 hover:bg-primary/10 font-medium"
                          : "hover:bg-muted/30"
                      }`}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <div
                            className={`rounded-lg p-2 bg-${color}-100 dark:bg-${color}-950/30`}
                          >
                            <Icon
                              className={`h-4 w-4 text-${color}-600 dark:text-${color}-400`}
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              {stat.label}
                              {stat.priority && (
                                <Badge
                                  variant="secondary"
                                  className="h-5 text-xs"
                                >
                                  {t("priority")}
                                </Badge>
                              )}
                            </div>
                            {stat.tooltip && (
                              <p className="text-muted-foreground text-xs">
                                {stat.tooltip}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      {values.map((value, playerIndex) => {
                        const isMax = value === maxValue && values.length > 1;
                        const isMin = value === minValue && values.length > 1;
                        const trend = getTrendForMetric(
                          stat.key,
                          stats[playerIndex].trends
                        );

                        return (
                          <TableCell
                            key={`${stat.key}-${stats[playerIndex].playerName}`}
                            className={`text-center font-mono text-lg tabular-nums ${
                              isMax
                                ? "bg-emerald-50 font-bold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                                : isMin && stat.category !== "consistency"
                                  ? "text-muted-foreground"
                                  : ""
                            }`}
                          >
                            <div className="flex items-center justify-center gap-2">
                              {formatStatValue(value, stat.format)}
                              {trend &&
                                Math.abs(trend.changePercentage) > 5 && (
                                  <div
                                    className={`flex items-center gap-0.5 ${
                                      trend.isImproving
                                        ? "text-emerald-600 dark:text-emerald-400"
                                        : "text-rose-600 dark:text-rose-400"
                                    }`}
                                  >
                                    {trend.isImproving ? (
                                      <TrendingUp className="h-3 w-3" />
                                    ) : (
                                      <TrendingDown className="h-3 w-3" />
                                    )}
                                  </div>
                                )}
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Context note */}
      <Card className="border-muted bg-muted/20">
        <CardContent className="space-y-2 py-4">
          <p className="text-muted-foreground text-center text-sm">
            {t("note")}
          </p>
          <p className="text-muted-foreground flex items-center justify-center gap-2 text-center text-xs">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>= Improving over time</span>
            <span className="mx-2">•</span>
            <TrendingDown className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
            <span>= Declining over time (requires 3+ maps)</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
