"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { QuickWinsStats } from "@/data/team-quick-wins-dto";
import { cn } from "@/lib/utils";
import { CalendarCheck, Clock, Trophy } from "lucide-react";
import { useTranslations } from "next-intl";

type QuickStatsCardProps = {
  stats: QuickWinsStats;
};

function formatFightDuration(seconds: number | null): string {
  if (seconds === null) return "N/A";
  return `${seconds.toFixed(1)}s`;
}

function getWinrateColor(winrate: number): string {
  if (winrate >= 60) return "text-green-600 dark:text-green-400";
  if (winrate >= 50) return "text-blue-600 dark:text-blue-400";
  if (winrate >= 40) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

export function QuickStatsCard({ stats }: QuickStatsCardProps) {
  const t = useTranslations("teamStatsPage.quickStatsCard");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Last 10 Games */}
          <div className="space-y-2">
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Trophy className="h-4 w-4" />
              <span>{t("last10Games")}</span>
            </div>
            <div className="space-y-1">
              <div
                className={cn(
                  "text-3xl font-bold",
                  getWinrateColor(stats.last10GamesPerformance.winrate)
                )}
              >
                {stats.last10GamesPerformance.winrate.toFixed(0)}%
              </div>
              <div className="text-muted-foreground text-xs">
                {t("winsLossesRecord", {
                  wins: stats.last10GamesPerformance.wins,
                  losses: stats.last10GamesPerformance.losses,
                })}
              </div>
            </div>
          </div>

          {/* Best Day of Week */}
          <div className="space-y-2">
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <CalendarCheck className="h-4 w-4" />
              <span>{t("bestDay")}</span>
            </div>
            {stats.bestDayOfWeek ? (
              <div className="space-y-1">
                <div className="text-2xl font-bold">
                  {stats.bestDayOfWeek.day}
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      stats.bestDayOfWeek.winrate >= 60 &&
                        "border-green-500 text-green-600 dark:text-green-400"
                    )}
                  >
                    {stats.bestDayOfWeek.winrate.toFixed(0)}% WR
                  </Badge>
                  <span className="text-muted-foreground text-xs">
                    {t("gamesLabel", {
                      count: stats.bestDayOfWeek.gamesPlayed,
                    })}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground text-sm">
                {t.rich("notEnoughData", {
                  span: (chunks) => <span className="text-xs">{chunks}</span>,
                })}
              </div>
            )}
          </div>

          {/* Average Fight Duration */}
          <div className="space-y-2">
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4" />
              <span>{t("avgFightDuration")}</span>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-bold">
                {formatFightDuration(stats.averageFightDuration)}
              </div>
              {stats.averageFightDuration !== null && (
                <div className="text-muted-foreground text-xs">
                  {stats.averageFightDuration < 20
                    ? t("quickFights")
                    : stats.averageFightDuration < 30
                      ? t("standard")
                      : t("longFights")}
                </div>
              )}
            </div>
          </div>

          {/* First Pick Success Rate */}
          <div className="space-y-2">
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Trophy className="h-4 w-4" />
              <span>{t("firstPickSuccess")}</span>
            </div>
            {stats.firstPickSuccessRate ? (
              <div className="space-y-1">
                <div
                  className={cn(
                    "text-3xl font-bold",
                    getWinrateColor(stats.firstPickSuccessRate.successRate)
                  )}
                >
                  {stats.firstPickSuccessRate.successRate.toFixed(0)}%
                </div>
                <div className="text-muted-foreground text-xs">
                  {t("firstPickSuccessRate", {
                    successfulFirstPicks:
                      stats.firstPickSuccessRate.successfulFirstPicks,
                    totalFirstPicks: stats.firstPickSuccessRate.totalFirstPicks,
                  })}
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground text-sm">{t("noData")}</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
