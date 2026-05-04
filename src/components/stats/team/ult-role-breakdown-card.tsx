"use client";

import { UltTimingChart } from "@/components/charts/ult-timing-chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { TeamUltStats } from "@/data/team/types";
import { useTranslations } from "next-intl";

type UltRoleBreakdownCardProps = {
  ultStats: TeamUltStats;
};

export function UltRoleBreakdownCard({ ultStats }: UltRoleBreakdownCardProps) {
  const t = useTranslations("teamStatsPage.ultimatesTab.roleBreakdown");

  if (ultStats.totalUltsUsed === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("noData")}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const allTimings = ultStats.roleBreakdown.flatMap((r) => r.subroleTimings);
  const hasTimingData = allTimings.some((t) => t.count > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {ultStats.roleBreakdown.map((role) => (
              <div
                key={role.role}
                className="border-border rounded-lg border p-4"
              >
                <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
                  {role.role}
                </p>
                <p className="mt-2 font-mono text-2xl font-bold tabular-nums">
                  {role.count}
                </p>
                <p className="text-muted-foreground text-xs">
                  {t("percentage", {
                    value: role.percentage.toFixed(1),
                  })}
                </p>
                {role.subroleTimings.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {role.subroleTimings.map((sr) => (
                      <div
                        key={sr.subrole}
                        className="text-muted-foreground flex items-center justify-between text-xs"
                      >
                        <span>{sr.subrole}</span>
                        <span className="font-medium tabular-nums">
                          {sr.count}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {hasTimingData && (
            <div>
              <h4 className="mb-3 font-semibold">{t("timingTitle")}</h4>
              <p className="text-muted-foreground mb-4 text-sm">
                {t("timingDescription")}
              </p>
              <UltTimingChart
                team1Timings={allTimings}
                team2Timings={[]}
                teamNames={[t("yourTeam"), ""] as const}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
