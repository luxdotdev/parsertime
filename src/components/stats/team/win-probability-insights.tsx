"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import type { TeamFightStats } from "@/data/team/types";
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
      <section className="space-y-4">
        <SectionHeader
          eyebrow="Teamfights · Win probability"
          title={t("title")}
        />
        <p className="text-muted-foreground text-sm">{t("noData")}</p>
      </section>
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

  const higherReversalRate = Math.max(
    fightStats.dryFightReversalRate,
    fightStats.nonDryFightReversalRate
  );
  if (fightStats.dryFights > 0 || fightStats.nonDryFights > 0) {
    insights.push({
      title: t("fightReversalComparison"),
      value: `${fightStats.dryFightReversalRate.toFixed(1)}% / ${fightStats.nonDryFightReversalRate.toFixed(1)}%`,
      description: t("fightReversalComparisonDescription", {
        dryRate: fightStats.dryFightReversalRate.toFixed(1),
        nonDryRate: fightStats.nonDryFightReversalRate.toFixed(1),
      }),
      impact:
        higherReversalRate > 15
          ? "high-positive"
          : higherReversalRate < 5
            ? "negative"
            : "moderate",
      detail: t("fightReversalComparisonDetail", {
        dryReversals: fightStats.dryFightReversals,
        nonDryReversals: fightStats.nonDryFightReversals,
      }),
    });
  }

  function getImpactLabel(impact: string): string {
    if (impact === "high-positive") return t("strongAdvantage");
    if (impact === "negative") return t("needsImprovement");
    return t("average");
  }

  function getImpactTagClass(impact: string): string {
    if (impact === "high-positive") return "bg-primary/15 text-primary";
    if (impact === "negative") return "bg-destructive/15 text-destructive";
    return "bg-muted text-muted-foreground";
  }

  return (
    <section className="space-y-6">
      <SectionHeader
        eyebrow="Teamfights · Win probability"
        title={t("title")}
        description={t("description")}
      />
      <div className="grid gap-4 md:grid-cols-2">
        {insights.map((insight) => (
          <div
            key={insight.title}
            className="border-border rounded-lg border p-4"
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <h4 className="font-semibold">{insight.title}</h4>
              <span
                className={`rounded-sm px-2 py-0.5 font-mono text-[10px] tracking-[0.16em] uppercase ${getImpactTagClass(insight.impact)}`}
              >
                {getImpactLabel(insight.impact)}
              </span>
            </div>
            <div className="text-foreground mb-2 font-mono text-3xl font-bold tabular-nums">
              {insight.value}
            </div>
            <p className="text-muted-foreground mb-1 text-sm">
              {insight.description}
            </p>
            <p className="text-muted-foreground text-xs">{insight.detail}</p>
          </div>
        ))}
      </div>

      <div className="border-border border-t pt-4">
        <h4 className="text-muted-foreground mb-3 font-mono text-[11px] tracking-[0.16em] uppercase">
          {t("overallFightPerformance")}
        </h4>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <div className="text-muted-foreground font-mono text-[10px] tracking-[0.18em] uppercase">
              {t("totalFights")}
            </div>
            <div className="text-foreground font-mono text-2xl font-bold tabular-nums">
              {fightStats.totalFights}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground font-mono text-[10px] tracking-[0.18em] uppercase">
              {t("fightsWon")}
            </div>
            <div className="text-foreground font-mono text-2xl font-bold tabular-nums">
              {fightStats.fightsWon}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground font-mono text-[10px] tracking-[0.18em] uppercase">
              {t("overallWinrate")}
            </div>
            <div className="text-foreground font-mono text-2xl font-bold tabular-nums">
              {fightStats.overallWinrate.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
