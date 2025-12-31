"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TeamFightStats } from "@/data/team-fight-stats-dto";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

type UltimateEconomyCardProps = {
  fightStats: TeamFightStats;
};

export function UltimateEconomyCard({ fightStats }: UltimateEconomyCardProps) {
  const t = useTranslations("teamStatsPage.ultimateEconomyCard");

  if (fightStats.totalFights === 0 || fightStats.totalUltsUsed === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {t("title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">{t("noData")}</p>
        </CardContent>
      </Card>
    );
  }

  const wastePercentage =
    (fightStats.wastedUltimates / fightStats.totalUltsUsed) * 100;

  function getEfficiencyColor(efficiency: number): string {
    if (efficiency >= 0.4) return "text-green-600 dark:text-green-400";
    if (efficiency >= 0.25) return "text-blue-600 dark:text-blue-400";
    if (efficiency >= 0.15) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  }

  function getEfficiencyRating(efficiency: number): string {
    if (efficiency >= 0.4) return t("excellent");
    if (efficiency >= 0.25) return t("good");
    if (efficiency >= 0.15) return t("average");
    return t("poor");
  }

  function getWasteColor(percentage: number): string {
    if (percentage >= 30) return "text-red-600 dark:text-red-400";
    if (percentage >= 20) return "text-yellow-600 dark:text-yellow-400";
    if (percentage >= 10) return "text-blue-600 dark:text-blue-400";
    return "text-green-600 dark:text-green-400";
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">{t("title")}</CardTitle>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Main Metrics */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border p-4">
              <div className="text-muted-foreground mb-2 text-sm">
                {t("ultimateEfficiency")}
              </div>
              <div
                className={cn(
                  "mb-1 text-3xl font-bold",
                  getEfficiencyColor(fightStats.ultimateEfficiency)
                )}
              >
                {fightStats.ultimateEfficiency.toFixed(2)}
              </div>
              <div className="text-muted-foreground text-xs">
                {t("fightsWonPerUltUsed")}
              </div>
              <div className="mt-2 text-xs font-medium">
                {getEfficiencyRating(fightStats.ultimateEfficiency)}
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="text-muted-foreground mb-2 text-sm">
                {t("wastedUltimates")}
              </div>
              <div
                className={cn(
                  "mb-1 text-3xl font-bold",
                  getWasteColor(wastePercentage)
                )}
              >
                {fightStats.wastedUltimates}
              </div>
              <div className="text-muted-foreground text-xs">
                {t("wastePercentage", {
                  percentage: wastePercentage.toFixed(1),
                })}
              </div>
              <div className="mt-2 text-xs font-medium">
                {t("usedInLostSituations")}
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="text-muted-foreground mb-2 text-sm">
                {t("totalUltimates")}
              </div>
              <div className="mb-1 text-3xl font-bold">
                {fightStats.totalUltsUsed}
              </div>
              <div className="text-muted-foreground text-xs">
                {t("acrossFights", {
                  fights: fightStats.totalFights,
                })}
              </div>
              <div className="mt-2 text-xs font-medium">
                {t("ultimatesPerFight", {
                  ultimates: (
                    fightStats.totalUltsUsed / fightStats.totalFights
                  ).toFixed(1),
                })}
              </div>
            </div>
          </div>

          {/* Usage Timing Comparison */}
          <div>
            <h4 className="mb-3 font-semibold">{t("ultimateUsage")}</h4>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-green-500 bg-green-50 p-4 dark:bg-green-950/30">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {t("winningFights")}
                  </span>
                  <span className="rounded bg-green-600 px-2 py-1 text-xs font-bold text-white">
                    {t("fights", {
                      count: fightStats.fightsWon,
                    })}
                  </span>
                </div>
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {fightStats.avgUltsInWonFights.toFixed(1)}
                </div>
                <div className="text-muted-foreground text-xs">
                  {t("averageUltsUsed")}
                </div>
              </div>

              <div className="rounded-lg border border-red-500 bg-red-50 p-4 dark:bg-red-950/30">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {t("losingFights")}
                  </span>
                  <span className="rounded bg-red-600 px-2 py-1 text-xs font-bold text-white">
                    {t("fights", {
                      count: fightStats.fightsLost,
                    })}
                  </span>
                </div>
                <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                  {fightStats.avgUltsInLostFights.toFixed(1)}
                </div>
                <div className="text-muted-foreground text-xs">
                  {t("averageUltsUsed")}
                </div>
              </div>
            </div>

            {/* Insight */}
            <div className="bg-muted mt-4 rounded-lg p-3 text-sm">
              {fightStats.avgUltsInWonFights >
              fightStats.avgUltsInLostFights ? (
                <>
                  {t.rich("goodUltDiscipline", {
                    span: (chunks) => (
                      <span className="font-semibold">{chunks}</span>
                    ),
                    ultsInWonFights: fightStats.avgUltsInWonFights.toFixed(1),
                    ultsInLostFights: fightStats.avgUltsInLostFights.toFixed(1),
                  })}
                </>
              ) : (
                <>
                  {t.rich("roomForImprovement", {
                    span: (chunks) => (
                      <span className="font-semibold">{chunks}</span>
                    ),
                    ultsInLostFights: fightStats.avgUltsInLostFights.toFixed(1),
                    ultsInWonFights: fightStats.avgUltsInWonFights.toFixed(1),
                  })}
                </>
              )}
            </div>
          </div>

          {/* Additional Context */}
          <div className="bg-muted rounded-lg p-4">
            <h4 className="mb-3 text-sm font-semibold">{t("context")}</h4>
            <div className="grid gap-3 text-sm md:grid-cols-2">
              <div>
                <span className="text-muted-foreground">{t("dryFights")}</span>{" "}
                <span className="font-medium">
                  {t("dryFightWinrate", {
                    count: fightStats.dryFights,
                    winrate: fightStats.dryFightWinrate.toFixed(1),
                  })}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">
                  {t("nonDryFights")}
                </span>{" "}
                <span className="font-medium">
                  {t("nonDryFightsCount", {
                    count: fightStats.nonDryFights,
                    ults: fightStats.avgUltsPerNonDryFight.toFixed(1),
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
