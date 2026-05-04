"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TeamFightStats } from "@/data/team/types";
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

  function getEfficiencyRatingKey(
    efficiency: number
  ): "excellent" | "good" | "average" | "poor" {
    if (efficiency >= 0.4) return "excellent";
    if (efficiency >= 0.25) return "good";
    if (efficiency >= 0.15) return "average";
    return "poor";
  }

  const efficiencyRating = getEfficiencyRatingKey(
    fightStats.ultimateEfficiency
  );

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
            <div className="bg-card border-border rounded-lg border p-4">
              <div className="text-muted-foreground mb-2 text-sm">
                {t("ultimateEfficiency")}
              </div>
              <div className="text-primary mb-1 font-mono text-3xl font-bold tabular-nums">
                {fightStats.ultimateEfficiency.toFixed(2)}
              </div>
              <div className="text-muted-foreground text-xs">
                {t("fightsWonPerUltUsed")}
              </div>
              <div className="mt-2">
                <span
                  className={cn(
                    "rounded-sm px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em]",
                    efficiencyRating === "excellent" ||
                      efficiencyRating === "good"
                      ? "bg-primary/15 text-primary"
                      : efficiencyRating === "poor"
                        ? "bg-destructive/15 text-destructive"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  {t(efficiencyRating)}
                </span>
              </div>
            </div>

            <div className="bg-card border-border rounded-lg border p-4">
              <div className="text-muted-foreground mb-2 text-sm">
                {t("wastedUltimates")}
              </div>
              <div className="text-foreground mb-1 font-mono text-3xl font-bold tabular-nums">
                {fightStats.wastedUltimates}
              </div>
              <div className="text-muted-foreground text-xs">
                {t("wastePercentage", {
                  percentage: wastePercentage.toFixed(1),
                })}
              </div>
              <div className="text-muted-foreground mt-2 text-xs font-medium">
                {t("usedInLostSituations")}
              </div>
            </div>

            <div className="bg-card border-border rounded-lg border p-4">
              <div className="text-muted-foreground mb-2 text-sm">
                {t("totalUltimates")}
              </div>
              <div className="text-foreground mb-1 font-mono text-3xl font-bold tabular-nums">
                {fightStats.totalUltsUsed}
              </div>
              <div className="text-muted-foreground text-xs">
                {t("acrossFights", {
                  fights: fightStats.totalFights,
                })}
              </div>
              <div className="text-muted-foreground mt-2 text-xs font-medium">
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
              <div className="bg-card border-border rounded-lg border p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
                    {t("winningFights")}
                  </span>
                  <span className="text-muted-foreground font-mono text-xs tabular-nums">
                    {t("fights", {
                      count: fightStats.fightsWon,
                    })}
                  </span>
                </div>
                <div className="text-foreground font-mono text-3xl font-bold tabular-nums">
                  {fightStats.avgUltsInWonFights.toFixed(1)}
                </div>
                <div className="text-muted-foreground text-xs">
                  {t("averageUltsUsed")}
                </div>
              </div>

              <div className="bg-card border-border rounded-lg border p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
                    {t("losingFights")}
                  </span>
                  <span className="text-muted-foreground font-mono text-xs tabular-nums">
                    {t("fights", {
                      count: fightStats.fightsLost,
                    })}
                  </span>
                </div>
                <div className="text-foreground font-mono text-3xl font-bold tabular-nums">
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

            {(fightStats.dryFights > 0 || fightStats.nonDryFights > 0) && (
              <div className="mt-4 border-t pt-3">
                <h4 className="mb-2 text-sm font-semibold">
                  {t("fightReversals")}
                </h4>
                <div className="grid gap-3 text-sm md:grid-cols-2">
                  {fightStats.dryFights > 0 && (
                    <div>
                      <span className="font-medium">
                        {t("dryReversalRate", {
                          rate: fightStats.dryFightReversalRate.toFixed(1),
                          count: fightStats.dryFightReversals,
                          total: fightStats.dryFights,
                        })}
                      </span>
                    </div>
                  )}
                  {fightStats.nonDryFights > 0 && (
                    <div>
                      <span className="font-medium">
                        {t("nonDryReversalRate", {
                          rate: fightStats.nonDryFightReversalRate.toFixed(1),
                          count: fightStats.nonDryFightReversals,
                          total: fightStats.nonDryFights,
                        })}
                      </span>
                    </div>
                  )}
                </div>
                {fightStats.dryFights > 0 && fightStats.nonDryFights > 0 && (
                  <p className="text-muted-foreground mt-2 text-xs">
                    {fightStats.nonDryFightReversalRate >
                    fightStats.dryFightReversalRate
                      ? t("reversalInsightUltReliant", {
                          nonDryRate:
                            fightStats.nonDryFightReversalRate.toFixed(1),
                          dryRate: fightStats.dryFightReversalRate.toFixed(1),
                        })
                      : t("reversalInsightMechanical", {
                          dryRate: fightStats.dryFightReversalRate.toFixed(1),
                          nonDryRate:
                            fightStats.nonDryFightReversalRate.toFixed(1),
                        })}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
