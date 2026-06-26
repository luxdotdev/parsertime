"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ComparisonStats } from "@/data/comparison/types";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, TrendingDown, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";

type DeltaViewProps = {
  stats: ComparisonStats;
};

type DeltaStat = {
  label: string;
  oldValue: number;
  newValue: number;
  format: "number" | "per10" | "time" | "percentage";
  reverseColors?: boolean;
  significant?: boolean;
};

function formatStat(
  value: number,
  format: "number" | "per10" | "time" | "percentage"
): string {
  if (format === "time") {
    const hours = Math.floor(value / 3600);
    const minutes = Math.floor((value % 3600) / 60);
    const seconds = Math.floor(value % 60);
    return hours > 0
      ? `${hours}h ${minutes}m ${seconds}s`
      : `${minutes}m ${seconds}s`;
  }
  if (format === "per10") {
    return value.toFixed(2);
  }
  if (format === "percentage") {
    return `${value.toFixed(1)}%`;
  }
  return value.toLocaleString();
}

function calculateDelta(oldValue: number, newValue: number) {
  const absoluteChange = newValue - oldValue;
  const percentageChange =
    oldValue !== 0 ? ((newValue - oldValue) / oldValue) * 100 : 0;

  return {
    absolute: absoluteChange,
    percentage: percentageChange,
    isIncrease: absoluteChange > 0,
    isSignificant: Math.abs(percentageChange) >= 10,
  };
}

export function DeltaView({ stats }: DeltaViewProps) {
  const t = useTranslations("comparePage.delta");

  if (stats.perMapBreakdown.length !== 2) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">{t("requiresTwoMaps")}</p>
        </CardContent>
      </Card>
    );
  }

  const [map1, map2] = stats.perMapBreakdown;

  const deltaStats: DeltaStat[] = [
    {
      label: t("stats.eliminations"),
      oldValue: map1.stats.eliminations ?? 0,
      newValue: map2.stats.eliminations ?? 0,
      format: "number",
    },
    {
      label: t("stats.deaths"),
      oldValue: map1.stats.deaths ?? 0,
      newValue: map2.stats.deaths ?? 0,
      format: "number",
      reverseColors: true,
    },
    {
      label: t("stats.damage"),
      oldValue: map1.stats.all_damage_dealt ?? 0,
      newValue: map2.stats.all_damage_dealt ?? 0,
      format: "number",
    },
    {
      label: t("stats.healing"),
      oldValue: map1.stats.healing_dealt ?? 0,
      newValue: map2.stats.healing_dealt ?? 0,
      format: "number",
    },
    {
      label: t("stats.mitigated"),
      oldValue: map1.stats.damage_blocked ?? 0,
      newValue: map2.stats.damage_blocked ?? 0,
      format: "number",
    },
    {
      label: t("stats.eliminationsPer10"),
      oldValue: map1.stats.eliminationsPer10 ?? 0,
      newValue: map2.stats.eliminationsPer10 ?? 0,
      format: "per10",
    },
    {
      label: t("stats.deathsPer10"),
      oldValue: map1.stats.deathsPer10 ?? 0,
      newValue: map2.stats.deathsPer10 ?? 0,
      format: "per10",
      reverseColors: true,
    },
    {
      label: t("stats.damagePer10"),
      oldValue: map1.stats.allDamagePer10 ?? 0,
      newValue: map2.stats.allDamagePer10 ?? 0,
      format: "per10",
    },
    {
      label: t("stats.healingPer10"),
      oldValue: map1.stats.healingDealtPer10 ?? 0,
      newValue: map2.stats.healingDealtPer10 ?? 0,
      format: "per10",
    },
    {
      label: t("stats.mitigatedPer10"),
      oldValue: map1.stats.damageBlockedPer10 ?? 0,
      newValue: map2.stats.damageBlockedPer10 ?? 0,
      format: "per10",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="space-y-2">
              <div className="text-muted-foreground text-sm font-medium">
                {t("from")}
              </div>
              <CardTitle>{map1.mapName}</CardTitle>
              <Badge variant="outline">
                {new Date(map1.date).toLocaleDateString()}
              </Badge>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <div className="space-y-2">
              <div className="text-muted-foreground text-sm font-medium">
                {t("to")}
              </div>
              <CardTitle>{map2.mapName}</CardTitle>
              <Badge variant="outline">
                {new Date(map2.date).toLocaleDateString()}
              </Badge>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Delta Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {deltaStats.map((stat) => {
          const delta = calculateDelta(stat.oldValue, stat.newValue);
          const isImprovement = stat.reverseColors
            ? !delta.isIncrease
            : delta.isIncrease;

          const changeColor = cn(
            delta.absolute === 0
              ? "text-muted-foreground"
              : isImprovement
                ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400"
          );

          const bgColor = cn(
            delta.absolute === 0
              ? "bg-muted"
              : isImprovement
                ? "bg-green-50 dark:bg-green-950/20"
                : "bg-red-50 dark:bg-red-950/20"
          );

          const Icon = delta.isIncrease ? TrendingUp : TrendingDown;

          return (
            <Card key={stat.label} className={bgColor}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-sm font-medium">
                      {stat.label}
                    </p>
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-2xl font-bold tabular-nums">
                        {formatStat(stat.newValue, stat.format)}
                      </span>
                      {delta.isSignificant && (
                        <Badge
                          variant="outline"
                          className="border-primary text-primary"
                        >
                          {t("significant")}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {delta.absolute !== 0 && (
                    <Icon className={cn("h-5 w-5", changeColor)} />
                  )}
                </div>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="space-y-1">
                  <div className="text-muted-foreground text-xs">
                    {t("previous")}: {formatStat(stat.oldValue, stat.format)}
                  </div>
                  <div className={cn("text-sm font-semibold", changeColor)}>
                    {delta.absolute > 0 ? "+" : ""}
                    {formatStat(Math.abs(delta.absolute), stat.format)} (
                    {delta.percentage > 0 ? "+" : ""}
                    {delta.percentage.toFixed(1)}%)
                    {delta.isIncrease ? (
                      <ArrowUp className="ml-1 inline h-3 w-3" />
                    ) : (
                      <ArrowDown className="ml-1 inline h-3 w-3" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>{t("summary")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {deltaStats
              .filter((stat) => {
                const delta = calculateDelta(stat.oldValue, stat.newValue);
                return delta.isSignificant;
              })
              .map((stat) => {
                const delta = calculateDelta(stat.oldValue, stat.newValue);
                const isImprovement = stat.reverseColors
                  ? !delta.isIncrease
                  : delta.isIncrease;

                return (
                  <div
                    key={stat.label}
                    className="border-border flex items-center gap-3 rounded-lg border p-3"
                  >
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                        isImprovement
                          ? "bg-green-100 dark:bg-green-950"
                          : "bg-red-100 dark:bg-red-950"
                      )}
                    >
                      {delta.isIncrease ? (
                        <ArrowUp
                          className={cn(
                            "h-5 w-5",
                            isImprovement
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          )}
                        />
                      ) : (
                        <ArrowDown
                          className={cn(
                            "h-5 w-5",
                            isImprovement
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          )}
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{stat.label}</p>
                      <p className="text-muted-foreground text-sm">
                        {formatStat(stat.oldValue, stat.format)} →{" "}
                        {formatStat(stat.newValue, stat.format)} (
                        {delta.percentage > 0 ? "+" : ""}
                        {delta.percentage.toFixed(1)}%)
                      </p>
                    </div>
                  </div>
                );
              })}
            {deltaStats.filter((stat) => {
              const delta = calculateDelta(stat.oldValue, stat.newValue);
              return delta.isSignificant;
            }).length === 0 && (
              <p className="text-muted-foreground text-center">
                {t("noSignificantChanges")}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
