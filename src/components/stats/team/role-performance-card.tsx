"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import type { RolePerformanceStats } from "@/data/team/types";
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
      <section className="space-y-4">
        <SectionHeader eyebrow="Performance · Roles" title={t("title")} />
        <p className="text-muted-foreground text-sm">{t("noDataAvailable")}</p>
      </section>
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
    <section className="space-y-4">
      <SectionHeader eyebrow="Performance · Roles" title={t("title")} />
      <div className="grid gap-6 md:grid-cols-3">
        {roles.map((role) => {
          const stats = roleStats[role];
          const Icon = roleIcons[role];
          const hasRoleData = stats.totalPlaytime > 0;

          return (
            <div
              key={role}
              className={cn(
                "border-border rounded-lg border p-4",
                !hasRoleData && "bg-muted/50"
              )}
            >
              <div className="mb-4 flex items-center gap-2">
                <Icon className="text-muted-foreground size-4" />
                <h3 className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
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
                    <span className="font-mono font-medium tabular-nums">
                      {formatTime(stats.totalPlaytime)}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("maps")}</span>
                    <span className="font-mono font-medium tabular-nums">
                      {stats.mapCount}
                    </span>
                  </div>

                  <div className="border-muted-foreground my-3 border-t" />

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("kd")}</span>
                    <span
                      className={cn(
                        "font-mono font-bold tabular-nums",
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
                    <span className="font-mono font-medium tabular-nums">
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
                      <span className="font-mono font-medium tabular-nums">
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
                        "font-mono font-medium tabular-nums",
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
                    <span className="font-mono font-medium tabular-nums">
                      {formatStat(stats.ultEfficiency, 1)}
                    </span>
                  </div>

                  <div className="border-muted-foreground my-3 border-t" />

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center">
                      <div className="text-muted-foreground">{t("elims")}</div>
                      <div className="font-mono font-semibold tabular-nums">
                        {stats.eliminations}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-muted-foreground">{t("deaths")}</div>
                      <div className="font-mono font-semibold tabular-nums">
                        {stats.deaths}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-muted-foreground">
                        {t("assists")}
                      </div>
                      <div className="font-mono font-semibold tabular-nums">
                        {stats.assists}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
