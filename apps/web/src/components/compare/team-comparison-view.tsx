"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TeamComparisonStats } from "@/types/team-comparison";
import { ArrowDown, ArrowUp, Minus, Users } from "lucide-react";
import { useTranslations } from "next-intl";

type TeamComparisonViewProps = {
  stats: TeamComparisonStats;
};

type StatComparison = {
  label: string;
  myTeamValue: number;
  enemyTeamValue: number;
  format: "number" | "per10" | "percentage" | "time" | "ratio";
  reverseColors?: boolean;
  suffix?: string;
};

function formatStatValue(
  value: number,
  format: "number" | "per10" | "percentage" | "time" | "ratio",
  suffix?: string
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
    return value.toFixed(1) + (suffix ?? "");
  }
  return value.toLocaleString() + (suffix ?? "");
}

function getComparisonIndicator(
  myTeamValue: number,
  enemyTeamValue: number,
  reverseColors = false
) {
  const diff = myTeamValue - enemyTeamValue;
  const percentChange =
    enemyTeamValue !== 0 ? Math.abs((diff / enemyTeamValue) * 100) : 0;

  if (percentChange < 2) {
    return {
      icon: Minus,
      colorClass: "text-muted-foreground",
      bgClass: "bg-muted/40",
      label: "neutral",
    };
  }

  const isAdvantage = reverseColors ? diff < 0 : diff > 0;

  return {
    icon: diff > 0 ? ArrowUp : ArrowDown,
    colorClass: isAdvantage
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-rose-600 dark:text-rose-400",
    bgClass: isAdvantage
      ? "bg-emerald-50 dark:bg-emerald-950/30"
      : "bg-rose-50 dark:bg-rose-950/30",
    label: isAdvantage ? "advantage" : "disadvantage",
  };
}

export function TeamComparisonView({ stats }: TeamComparisonViewProps) {
  const t = useTranslations("comparePage.teamComparison");

  const combatStats: StatComparison[] = [
    {
      label: t("stats.eliminationsPer10"),
      myTeamValue: stats.myTeam.stats.eliminationsPer10,
      enemyTeamValue: stats.enemyTeam.stats.eliminationsPer10,
      format: "per10",
    },
    {
      label: t("stats.finalBlowsPer10"),
      myTeamValue: stats.myTeam.stats.finalBlowsPer10,
      enemyTeamValue: stats.enemyTeam.stats.finalBlowsPer10,
      format: "per10",
    },
    {
      label: t("stats.deathsPer10"),
      myTeamValue: stats.myTeam.stats.deathsPer10,
      enemyTeamValue: stats.enemyTeam.stats.deathsPer10,
      format: "per10",
      reverseColors: true,
    },
    {
      label: t("stats.firstPickPercentage"),
      myTeamValue: stats.myTeam.stats.firstPickPercentage,
      enemyTeamValue: stats.enemyTeam.stats.firstPickPercentage,
      format: "percentage",
    },
    {
      label: t("stats.firstDeathPercentage"),
      myTeamValue: stats.myTeam.stats.firstDeathPercentage,
      enemyTeamValue: stats.enemyTeam.stats.firstDeathPercentage,
      format: "percentage",
      reverseColors: true,
    },
  ];

  const damageStats: StatComparison[] = [
    {
      label: t("stats.heroDamagePer10"),
      myTeamValue: stats.myTeam.stats.heroDamagePer10,
      enemyTeamValue: stats.enemyTeam.stats.heroDamagePer10,
      format: "per10",
    },
    {
      label: t("stats.damageTakenPer10"),
      myTeamValue: stats.myTeam.stats.damageTakenPer10,
      enemyTeamValue: stats.enemyTeam.stats.damageTakenPer10,
      format: "per10",
      reverseColors: true,
    },
  ];

  const supportStats: StatComparison[] = [
    {
      label: t("stats.healingDealtPer10"),
      myTeamValue: stats.myTeam.stats.healingDealtPer10,
      enemyTeamValue: stats.enemyTeam.stats.healingDealtPer10,
      format: "per10",
    },
    {
      label: t("stats.damageBlockedPer10"),
      myTeamValue: stats.myTeam.stats.damageBlockedPer10,
      enemyTeamValue: stats.enemyTeam.stats.damageBlockedPer10,
      format: "per10",
    },
  ];

  const ultimateStats: StatComparison[] = [
    {
      label: t("stats.ultimatesEarnedPer10"),
      myTeamValue: stats.myTeam.stats.ultimatesEarnedPer10,
      enemyTeamValue: stats.enemyTeam.stats.ultimatesEarnedPer10,
      format: "per10",
    },
    {
      label: t("stats.averageUltChargeTime"),
      myTeamValue: stats.myTeam.stats.averageUltChargeTime,
      enemyTeamValue: stats.enemyTeam.stats.averageUltChargeTime,
      format: "time",
      reverseColors: true,
    },
    {
      label: t("stats.killsPerUltimate"),
      myTeamValue: stats.myTeam.stats.killsPerUltimate,
      enemyTeamValue: stats.enemyTeam.stats.killsPerUltimate,
      format: "ratio",
    },
  ];

  function renderStatComparison(stat: StatComparison) {
    const indicator = getComparisonIndicator(
      stat.myTeamValue,
      stat.enemyTeamValue,
      stat.reverseColors
    );
    const Icon = indicator.icon;

    return (
      <div
        key={stat.label}
        className="group border-border/40 hover:bg-muted/20 grid grid-cols-[1fr_auto_1fr] items-center gap-6 border-b py-4 transition-colors last:border-0"
      >
        {/* My Team Value */}
        <div className="flex items-center justify-end gap-3">
          <span className="font-mono text-xl font-bold tracking-tight tabular-nums">
            {formatStatValue(stat.myTeamValue, stat.format, stat.suffix)}
          </span>
          {indicator.label === "advantage" && (
            <div className={`rounded-lg p-2 ${indicator.bgClass}`}>
              <Icon className={`h-4 w-4 ${indicator.colorClass}`} />
            </div>
          )}
        </div>

        {/* Stat Label */}
        <div className="min-w-[200px] text-center">
          <span className="text-muted-foreground text-sm font-medium">
            {stat.label}
          </span>
        </div>

        {/* Enemy Team Value */}
        <div className="flex items-center justify-start gap-3">
          {indicator.label === "disadvantage" && (
            <div className={`rounded-lg p-2 ${indicator.bgClass}`}>
              <Icon className={`h-4 w-4 ${indicator.colorClass}`} />
            </div>
          )}
          <span className="font-mono text-xl font-bold tracking-tight tabular-nums">
            {formatStatValue(stat.enemyTeamValue, stat.format, stat.suffix)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Team Headers */}
      <div className="grid grid-cols-2 gap-6">
        <Card className="border-primary/20 from-primary/5 border-2 bg-gradient-to-br to-transparent">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-center gap-3">
              <div className="bg-primary/10 rounded-full p-3">
                <Users className="text-primary h-6 w-6" />
              </div>
              <div className="text-center">
                <CardTitle className="text-2xl">
                  {stats.myTeam.teamName}
                </CardTitle>
                <p className="text-muted-foreground text-sm">
                  {t("myTeam")} • {stats.myTeam.playerCount}{" "}
                  {t("players", { count: stats.myTeam.playerCount })}
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="border-muted-foreground/20 border-2">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-center gap-3">
              <div className="bg-muted rounded-full p-3">
                <Users className="text-muted-foreground h-6 w-6" />
              </div>
              <div className="text-center">
                <CardTitle className="text-2xl">
                  {stats.enemyTeam.teamName}
                </CardTitle>
                <p className="text-muted-foreground text-sm">
                  {t("enemyTeam")} • {stats.enemyTeam.playerCount}{" "}
                  {t("players", { count: stats.enemyTeam.playerCount })}
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Context Badge */}
      <div className="flex justify-center">
        <Badge variant="outline" className="text-sm">
          {t("comparingMaps", { count: stats.mapCount })}
        </Badge>
      </div>

      {/* Combat Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            {t("categories.combat")}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-6 pt-0 pb-6">
          {combatStats.map((stat) => renderStatComparison(stat))}
        </CardContent>
      </Card>

      {/* Damage Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-orange-500" />
            {t("categories.damage")}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-6 pt-0 pb-6">
          {damageStats.map((stat) => renderStatComparison(stat))}
        </CardContent>
      </Card>

      {/* Support Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {t("categories.support")}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-6 pt-0 pb-6">
          {supportStats.map((stat) => renderStatComparison(stat))}
        </CardContent>
      </Card>

      {/* Ultimate Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-violet-500" />
            {t("categories.ultimate")}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-6 pt-0 pb-6">
          {ultimateStats.map((stat) => renderStatComparison(stat))}
        </CardContent>
      </Card>
    </div>
  );
}
