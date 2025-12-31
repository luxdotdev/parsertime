"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RolePerformanceStats } from "@/data/team-role-stats-dto";
import { cn } from "@/lib/utils";
import { Heart, Shield, Swords } from "lucide-react";
import { useTranslations } from "next-intl";

type RolePerformanceCardProps = {
  roleStats: RolePerformanceStats;
};

const roleIcons = {
  Tank: Shield,
  Damage: Swords,
  Support: Heart,
};

const roleColors = {
  Tank: "text-blue-600 dark:text-blue-400",
  Damage: "text-red-600 dark:text-red-400",
  Support: "text-yellow-600 dark:text-yellow-400",
};

const roleBgColors = {
  Tank: "bg-blue-100 dark:bg-blue-950",
  Damage: "bg-red-100 dark:bg-red-950",
  Support: "bg-yellow-100 dark:bg-yellow-950",
};

export function RolePerformanceCard({ roleStats }: RolePerformanceCardProps) {
  const t = useTranslations("teamStatsPage.rolePerformanceCard");

  const roles: ("Tank" | "Damage" | "Support")[] = [
    "Tank",
    "Damage",
    "Support",
  ];

  const hasData = roles.some((role) => roleStats[role].totalPlaytime > 0);

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            {t("noDataAvailable")}
          </p>
        </CardContent>
      </Card>
    );
  }

  function formatStat(value: number, decimals = 1): string {
    return value.toFixed(decimals);
  }

  function formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-3">
          {roles.map((role) => {
            const stats = roleStats[role];
            const Icon = roleIcons[role];
            const hasRoleData = stats.totalPlaytime > 0;

            return (
              <div
                key={role}
                className={cn(
                  "rounded-lg border p-4",
                  hasRoleData ? roleBgColors[role] : "bg-muted/50"
                )}
              >
                <div className="mb-4 flex items-center gap-2">
                  <Icon className={cn("h-6 w-6", roleColors[role])} />
                  <h3 className={cn("text-lg font-bold", roleColors[role])}>
                    {role}
                  </h3>
                </div>

                {!hasRoleData ? (
                  <p className="text-muted-foreground text-sm">{t("noData")}</p>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {t("playtime")}
                      </span>
                      <span className="font-medium">
                        {formatTime(stats.totalPlaytime)}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t("maps")}</span>
                      <span className="font-medium">{stats.mapCount}</span>
                    </div>

                    <div className="border-muted-foreground my-3 border-t" />

                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t("kd")}</span>
                      <span
                        className={cn(
                          "font-bold",
                          stats.kd >= 1
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        )}
                      >
                        {formatStat(stats.kd, 2)}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {t("damagePerMin")}
                      </span>
                      <span className="font-medium">
                        {stats.damagePer10Min.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>

                    {role === "Support" && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {t("healingPerMin")}
                        </span>
                        <span className="font-medium">
                          {stats.healingPer10Min.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {t("deathsPerMin")}
                      </span>
                      <span
                        className={cn(
                          "font-medium",
                          stats.deathsPer10Min < 5
                            ? "text-green-600 dark:text-green-400"
                            : stats.deathsPer10Min > 10
                              ? "text-red-600 dark:text-red-400"
                              : ""
                        )}
                      >
                        {stats.deathsPer10Min.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {t("ultEfficiency")}
                      </span>
                      <span className="font-medium">
                        {formatStat(stats.ultEfficiency, 1)}
                      </span>
                    </div>

                    <div className="border-muted-foreground my-3 border-t" />

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center">
                        <div className="text-muted-foreground">
                          {t("elims")}
                        </div>
                        <div className="font-semibold">
                          {stats.eliminations}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-muted-foreground">
                          {t("deaths")}
                        </div>
                        <div className="font-semibold">{stats.deaths}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-muted-foreground">
                          {t("assists")}
                        </div>
                        <div className="font-semibold">{stats.assists}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
