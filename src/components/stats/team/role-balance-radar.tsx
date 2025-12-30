"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  RoleBalanceAnalysis,
  RolePerformanceStats,
} from "@/data/team-role-stats-dto";
import { round } from "@/lib/utils";
import { useTranslations } from "next-intl";
import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  type TooltipProps,
} from "recharts";
import type {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";

function CustomTooltip({ active, payload }: TooltipProps<ValueType, NameType>) {
  if (active && payload?.length) {
    return (
      <div className="bg-popover text-popover-foreground border-border z-50 overflow-hidden rounded-md border px-3 py-2 shadow-xl">
        <p className="text-sm font-semibold">Role Balance</p>
        <p className="text-[#3b82f6]">
          Tank: {round(payload[0].value as number)}
        </p>
        <p className="text-[#ef4444]">
          Damage: {round(payload[1].value as number)}
        </p>
        <p className="text-[#eab308]">
          Support: {round(payload[2].value as number)}
        </p>
      </div>
    );
  }
}

type RoleBalanceRadarProps = {
  roleStats: RolePerformanceStats;
  balanceAnalysis: RoleBalanceAnalysis;
};

export function RoleBalanceRadar({
  roleStats,
  balanceAnalysis,
}: RoleBalanceRadarProps) {
  const t = useTranslations("teamStatsPage.roleBalanceRadar");

  const hasData = ["Tank", "Damage", "Support"].some(
    (role) => roleStats[role as keyof RolePerformanceStats].totalPlaytime > 0
  );

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">{t("noData")}</p>
        </CardContent>
      </Card>
    );
  }

  function normalizeKD(kd: number): number {
    return Math.min((kd / 3) * 100, 100);
  }

  function normalizeSurvivability(deathsPer10Min: number): number {
    return Math.max(0, 100 - deathsPer10Min * 4);
  }

  function normalizeUltUsage(ultEfficiency: number): number {
    return Math.min((ultEfficiency / 4) * 100, 100);
  }

  function normalizeActivity(totalPlaytime: number): number {
    return Math.min((totalPlaytime / 7200) * 100, 100);
  }

  const chartData = [
    {
      metric: t("eliminations"),
      Tank: normalizeKD(roleStats.Tank.kd),
      Damage: normalizeKD(roleStats.Damage.kd),
      Support: normalizeKD(roleStats.Support.kd),
    },
    {
      metric: t("survivability"),
      Tank: normalizeSurvivability(roleStats.Tank.deathsPer10Min),
      Damage: normalizeSurvivability(roleStats.Damage.deathsPer10Min),
      Support: normalizeSurvivability(roleStats.Support.deathsPer10Min),
    },
    {
      metric: t("ultUsage"),
      Tank: normalizeUltUsage(roleStats.Tank.ultEfficiency),
      Damage: normalizeUltUsage(roleStats.Damage.ultEfficiency),
      Support: normalizeUltUsage(roleStats.Support.ultEfficiency),
    },
    {
      metric: t("activity"),
      Tank: normalizeActivity(roleStats.Tank.totalPlaytime),
      Damage: normalizeActivity(roleStats.Damage.totalPlaytime),
      Support: normalizeActivity(roleStats.Support.totalPlaytime),
    },
  ];

  function getBalanceBadgeColor(
    overall: RoleBalanceAnalysis["overall"]
  ): string {
    switch (overall) {
      case "Balanced":
        return "bg-green-500";
      case "Insufficient data":
        return "bg-gray-500";
      default:
        return "bg-yellow-500";
    }
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{t("title")}</CardTitle>
          <Badge className={getBalanceBadgeColor(balanceAnalysis.overall)}>
            {balanceAnalysis.overall}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={chartData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="metric" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Radar
                name={t("tank")}
                dataKey="Tank"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.5}
              />
              <Radar
                name={t("damage")}
                dataKey="Damage"
                stroke="#ef4444"
                fill="#ef4444"
                fillOpacity={0.5}
              />
              <Radar
                name={t("support")}
                dataKey="Support"
                stroke="#eab308"
                fill="#eab308"
                fillOpacity={0.5}
              />
              <Legend />
              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>

          {balanceAnalysis.insights.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">{t("insights")}</h4>
              <ul className="text-muted-foreground space-y-1 text-sm">
                {balanceAnalysis.insights.map((insight) => (
                  <li key={insight} className="flex gap-2">
                    <span>•</span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {balanceAnalysis.strongestRole && balanceAnalysis.weakestRole && (
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("strongest")}</span>
                <span className="font-semibold text-green-600 dark:text-green-400">
                  {balanceAnalysis.strongestRole}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("needsWork")}</span>
                <span className="font-semibold text-red-600 dark:text-red-400">
                  {balanceAnalysis.weakestRole}
                </span>
              </div>
              <div className="mt-2 flex justify-between">
                <span className="text-muted-foreground">
                  {t("balanceScore")}
                </span>
                <span className="font-semibold">
                  {(balanceAnalysis.balanceScore * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
