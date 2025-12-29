"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TeamFightStats } from "@/data/team-fight-stats-dto";
import { useTranslations } from "next-intl";

type WinProbabilityInsightsProps = {
  fightStats: TeamFightStats;
};

export function WinProbabilityInsights({
  fightStats,
}: WinProbabilityInsightsProps) {
  const t = useTranslations("teamStatsPage.winProbabilityInsights");

  if (fightStats.totalFights === 0) {
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

  const insights = [
    {
      title: t("firstPickImpact"),
      value: `${fightStats.firstPickWinrate.toFixed(1)}%`,
      description: t("firstPickImpactDescription", {
        winrate: fightStats.firstPickWinrate.toFixed(1),
      }),
      impact:
        fightStats.firstPickWinrate > 65
          ? "high-positive"
          : fightStats.firstPickWinrate < 45
            ? "negative"
            : "moderate",
      detail: t("firstPickCount", {
        wins: fightStats.firstPickWins,
        fights: fightStats.firstPickFights,
      }),
    },
    {
      title: t("firstDeathComeback"),
      value: `${fightStats.firstDeathWinrate.toFixed(1)}%`,
      description: t("firstDeathComebackDescription", {
        winrate: fightStats.firstDeathWinrate.toFixed(1),
      }),
      impact:
        fightStats.firstDeathWinrate > 35
          ? "high-positive"
          : fightStats.firstDeathWinrate < 20
            ? "negative"
            : "moderate",
      detail: t("firstDeathCount", {
        wins: fightStats.firstDeathWins,
        fights: fightStats.firstDeathFights,
      }),
    },
    {
      title: t("ultimateAdvantage"),
      value: `${fightStats.firstUltWinrate.toFixed(1)}%`,
      description: t("ultimateAdvantageDescription", {
        winrate: fightStats.firstUltWinrate.toFixed(1),
      }),
      impact:
        fightStats.firstUltWinrate > 60
          ? "high-positive"
          : fightStats.firstUltWinrate < 45
            ? "negative"
            : "moderate",
      detail: t("ultimateCount", {
        wins: fightStats.firstUltWins,
        fights: fightStats.firstUltFights,
      }),
    },
    {
      title: t("dryFightSuccess"),
      value: `${fightStats.dryFightWinrate.toFixed(1)}%`,
      description: t("dryFightSuccessDescription", {
        winrate: fightStats.dryFightWinrate.toFixed(1),
      }),
      impact:
        fightStats.dryFightWinrate > 55
          ? "high-positive"
          : fightStats.dryFightWinrate < 40
            ? "negative"
            : "moderate",
      detail: t("dryFightCount", {
        wins: fightStats.dryFightWins,
        fights: fightStats.dryFights,
      }),
    },
  ];

  function getImpactColor(impact: string): string {
    if (impact === "high-positive")
      return "border-green-500 bg-green-50 dark:bg-green-950/30";
    if (impact === "negative")
      return "border-red-500 bg-red-50 dark:bg-red-950/30";
    return "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30";
  }

  function getImpactBadge(impact: string): string {
    if (impact === "high-positive") return t("strongAdvantage");
    if (impact === "negative") return t("needsImprovement");
    return t("average");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">{t("title")}</CardTitle>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {insights.map((insight) => (
            <div
              key={insight.title}
              className={`rounded-lg border p-4 ${getImpactColor(insight.impact)}`}
            >
              <div className="mb-2 flex items-start justify-between">
                <h4 className="font-semibold">{insight.title}</h4>
                <span
                  className={`rounded px-2 py-1 text-xs ${
                    insight.impact === "high-positive"
                      ? "bg-green-600 text-white"
                      : insight.impact === "negative"
                        ? "bg-red-600 text-white"
                        : "bg-yellow-600 text-white"
                  }`}
                >
                  {getImpactBadge(insight.impact)}
                </span>
              </div>
              <div className="mb-2 text-3xl font-bold">{insight.value}</div>
              <p className="text-muted-foreground mb-1 text-sm">
                {insight.description}
              </p>
              <p className="text-muted-foreground text-xs">{insight.detail}</p>
            </div>
          ))}
        </div>

        <div className="bg-muted mt-6 rounded-lg p-4">
          <h4 className="mb-2 text-sm font-semibold">
            {t("overallFightPerformance")}
          </h4>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <div className="text-muted-foreground text-xs">
                {t("totalFights")}
              </div>
              <div className="text-2xl font-bold">{fightStats.totalFights}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">
                {t("fightsWon")}
              </div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {fightStats.fightsWon}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">
                {t("overallWinrate")}
              </div>
              <div
                className={`text-2xl font-bold ${
                  fightStats.overallWinrate >= 55
                    ? "text-green-600 dark:text-green-400"
                    : fightStats.overallWinrate >= 45
                      ? "text-yellow-600 dark:text-yellow-400"
                      : "text-red-600 dark:text-red-400"
                }`}
              >
                {fightStats.overallWinrate.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
