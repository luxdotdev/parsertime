"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ComparisonStats } from "@/data/comparison";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { useTranslations } from "next-intl";

type SideBySideViewProps = {
  stats: ComparisonStats;
};

type StatRow = {
  label: string;
  map1Value: number;
  map2Value: number;
  format: "number" | "per10" | "time";
  reverseColors?: boolean;
};

function formatStat(
  value: number,
  format: "number" | "per10" | "time"
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
  return value.toLocaleString();
}

function getComparisonIndicator(
  value1: number,
  value2: number,
  reverseColors = false
) {
  const diff = value2 - value1;
  const percentChange = value1 !== 0 ? (diff / value1) * 100 : 0;

  if (Math.abs(percentChange) < 1) {
    return {
      icon: Minus,
      color: "text-muted-foreground",
      bgColor: "bg-muted",
    };
  }

  const isImprovement = reverseColors ? diff < 0 : diff > 0;

  return {
    icon: diff > 0 ? ArrowUp : ArrowDown,
    color: isImprovement
      ? "text-green-600 dark:text-green-400"
      : "text-red-600 dark:text-red-400",
    bgColor: isImprovement
      ? "bg-green-100 dark:bg-green-950"
      : "bg-red-100 dark:bg-red-950",
  };
}

export function SideBySideView({ stats }: SideBySideViewProps) {
  const t = useTranslations("comparePage.sideBySide");

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

  const statRows: StatRow[] = [
    {
      label: t("stats.eliminations"),
      map1Value: map1.stats.eliminations ?? 0,
      map2Value: map2.stats.eliminations ?? 0,
      format: "number",
    },
    {
      label: t("stats.deaths"),
      map1Value: map1.stats.deaths ?? 0,
      map2Value: map2.stats.deaths ?? 0,
      format: "number",
      reverseColors: true,
    },
    {
      label: t("stats.damage"),
      map1Value: map1.stats.all_damage_dealt ?? 0,
      map2Value: map2.stats.all_damage_dealt ?? 0,
      format: "number",
    },
    {
      label: t("stats.healing"),
      map1Value: map1.stats.healing_dealt ?? 0,
      map2Value: map2.stats.healing_dealt ?? 0,
      format: "number",
    },
    {
      label: t("stats.mitigated"),
      map1Value: map1.stats.damage_blocked ?? 0,
      map2Value: map2.stats.damage_blocked ?? 0,
      format: "number",
    },
    {
      label: t("stats.eliminationsPer10"),
      map1Value: map1.stats.eliminationsPer10 ?? 0,
      map2Value: map2.stats.eliminationsPer10 ?? 0,
      format: "per10",
    },
    {
      label: t("stats.deathsPer10"),
      map1Value: map1.stats.deathsPer10 ?? 0,
      map2Value: map2.stats.deathsPer10 ?? 0,
      format: "per10",
      reverseColors: true,
    },
    {
      label: t("stats.damagePer10"),
      map1Value: map1.stats.allDamagePer10 ?? 0,
      map2Value: map2.stats.allDamagePer10 ?? 0,
      format: "per10",
    },
    {
      label: t("stats.healingPer10"),
      map1Value: map1.stats.healingDealtPer10 ?? 0,
      map2Value: map2.stats.healingDealtPer10 ?? 0,
      format: "per10",
    },
    {
      label: t("stats.mitigatedPer10"),
      map1Value: map1.stats.damageBlockedPer10 ?? 0,
      map2Value: map2.stats.damageBlockedPer10 ?? 0,
      format: "per10",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Map Headers */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">{map1.mapName}</CardTitle>
            <div className="flex items-center justify-center gap-2 pt-2">
              <Badge variant="outline">
                {new Date(map1.date).toLocaleDateString()}
              </Badge>
              {map1.heroes.length > 0 && (
                <Badge variant="secondary">{map1.heroes.join(", ")}</Badge>
              )}
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">{map2.mapName}</CardTitle>
            <div className="flex items-center justify-center gap-2 pt-2">
              <Badge variant="outline">
                {new Date(map2.date).toLocaleDateString()}
              </Badge>
              {map2.heroes.length > 0 && (
                <Badge variant="secondary">{map2.heroes.join(", ")}</Badge>
              )}
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Stats Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("statComparison")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-border divide-y">
            {statRows.map((row) => {
              const indicator = getComparisonIndicator(
                row.map1Value,
                row.map2Value,
                row.reverseColors
              );
              const Icon = indicator.icon;

              return (
                <div
                  key={row.label}
                  className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-4 py-4"
                >
                  {/* Map 1 Value */}
                  <div className="text-right">
                    <span className="font-mono text-lg font-semibold tabular-nums">
                      {formatStat(row.map1Value, row.format)}
                    </span>
                  </div>

                  {/* Indicator */}
                  <div className={`rounded-full p-2 ${indicator.bgColor}`}>
                    <Icon className={`h-4 w-4 ${indicator.color}`} />
                  </div>

                  {/* Stat Label */}
                  <div className="text-center">
                    <span className="text-sm font-medium">{row.label}</span>
                  </div>

                  {/* Indicator */}
                  <div className={`rounded-full p-2 ${indicator.bgColor}`}>
                    <Icon className={`h-4 w-4 ${indicator.color}`} />
                  </div>

                  {/* Map 2 Value */}
                  <div className="text-left">
                    <span className="font-mono text-lg font-semibold tabular-nums">
                      {formatStat(row.map2Value, row.format)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
