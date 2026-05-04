"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
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
      <section className="space-y-4">
        <SectionHeader eyebrow="Ultimates · Economy" title={t("title")} />
        <p className="text-muted-foreground text-sm">{t("noData")}</p>
      </section>
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

  const ultsPerFight = fightStats.totalUltsUsed / fightStats.totalFights;

  const economyRows = [
    {
      label: t("ultimateEfficiency"),
      value: fightStats.ultimateEfficiency.toFixed(2),
      sub: t("fightsWonPerUltUsed"),
      emphasis: true,
      tag: t(efficiencyRating),
      tagTone:
        efficiencyRating === "excellent" || efficiencyRating === "good"
          ? "positive"
          : efficiencyRating === "poor"
            ? "negative"
            : "neutral",
    },
    {
      label: t("wastedUltimates"),
      value: String(fightStats.wastedUltimates),
      sub: t("wastePercentage", {
        percentage: wastePercentage.toFixed(1),
      }),
    },
    {
      label: t("totalUltimates"),
      value: String(fightStats.totalUltsUsed),
      sub: t("ultimatesPerFight", {
        ultimates: ultsPerFight.toFixed(1),
      }),
    },
  ] as const;

  const winLossDelta =
    fightStats.avgUltsInWonFights - fightStats.avgUltsInLostFights;
  const goodDiscipline = winLossDelta > 0;

  const hasReversalData =
    fightStats.dryFights > 0 || fightStats.nonDryFights > 0;

  return (
    <section className="space-y-6">
      <SectionHeader
        eyebrow="Ultimates · Economy"
        title={t("title")}
        description={t("description")}
      />

      <dl className="border-border grid grid-cols-1 divide-x divide-y divide-[var(--border)] border-y sm:grid-cols-2 lg:grid-cols-3 lg:divide-y-0">
        {economyRows.map((row) => (
          <div key={row.label} className="flex flex-col gap-1 px-4 py-3">
            <dt className="text-muted-foreground font-mono text-[10px] tracking-[0.18em] uppercase">
              {row.label}
            </dt>
            <dd
              className={cn(
                "font-mono text-2xl leading-none font-semibold tabular-nums",
                "emphasis" in row && row.emphasis
                  ? "text-primary"
                  : "text-foreground"
              )}
            >
              {row.value}
            </dd>
            {row.sub ? (
              <dd className="text-muted-foreground text-xs">{row.sub}</dd>
            ) : null}
            {"tag" in row && row.tag ? (
              <dd>
                <span
                  className={cn(
                    "inline-block rounded-sm px-2 py-0.5 font-mono text-[10px] tracking-[0.16em] uppercase",
                    row.tagTone === "positive" && "bg-primary/15 text-primary",
                    row.tagTone === "negative" &&
                      "bg-destructive/15 text-destructive",
                    row.tagTone === "neutral" &&
                      "bg-muted text-muted-foreground"
                  )}
                >
                  {row.tag}
                </span>
              </dd>
            ) : null}
          </div>
        ))}
      </dl>

      <div className="space-y-3">
        <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
          {t("ultimateUsage")}
        </p>
        <div className="border-border overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
                <th className="px-4 py-2 text-left font-medium">Outcome</th>
                <th className="px-4 py-2 text-right font-medium">Fights</th>
                <th className="px-4 py-2 text-right font-medium">
                  Avg ults used
                </th>
                <th className="px-4 py-2 text-left font-medium">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              <tr className="hover:bg-muted/30 transition-colors">
                <td className="text-foreground px-4 py-3 font-medium">
                  {t("winningFights")}
                </td>
                <td className="text-muted-foreground px-4 py-3 text-right font-mono tabular-nums">
                  {fightStats.fightsWon}
                </td>
                <td
                  className={cn(
                    "px-4 py-3 text-right font-mono font-semibold tabular-nums",
                    goodDiscipline ? "text-primary" : "text-foreground"
                  )}
                >
                  {fightStats.avgUltsInWonFights.toFixed(1)}
                </td>
                <td className="text-muted-foreground px-4 py-3 text-xs">
                  {t("averageUltsUsed")}
                </td>
              </tr>
              <tr className="hover:bg-muted/30 transition-colors">
                <td className="text-foreground px-4 py-3 font-medium">
                  {t("losingFights")}
                </td>
                <td className="text-muted-foreground px-4 py-3 text-right font-mono tabular-nums">
                  {fightStats.fightsLost}
                </td>
                <td
                  className={cn(
                    "px-4 py-3 text-right font-mono font-semibold tabular-nums",
                    goodDiscipline ? "text-foreground" : "text-destructive"
                  )}
                >
                  {fightStats.avgUltsInLostFights.toFixed(1)}
                </td>
                <td className="text-muted-foreground px-4 py-3 text-xs">
                  {t("averageUltsUsed")}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-muted-foreground text-sm">
          {goodDiscipline ? (
            <>
              {t.rich("goodUltDiscipline", {
                span: (chunks) => (
                  <span className="text-foreground font-semibold">
                    {chunks}
                  </span>
                ),
                ultsInWonFights: fightStats.avgUltsInWonFights.toFixed(1),
                ultsInLostFights: fightStats.avgUltsInLostFights.toFixed(1),
              })}
            </>
          ) : (
            <>
              {t.rich("roomForImprovement", {
                span: (chunks) => (
                  <span className="text-foreground font-semibold">
                    {chunks}
                  </span>
                ),
                ultsInLostFights: fightStats.avgUltsInLostFights.toFixed(1),
                ultsInWonFights: fightStats.avgUltsInWonFights.toFixed(1),
              })}
            </>
          )}
        </p>
      </div>

      {hasReversalData && (
        <div className="space-y-3">
          <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
            {t("context")}
          </p>
          <div className="border-border overflow-hidden rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
                  <th className="px-4 py-2 text-left font-medium">Bucket</th>
                  <th className="px-4 py-2 text-right font-medium">Fights</th>
                  <th className="px-4 py-2 text-right font-medium">Winrate</th>
                  <th className="px-4 py-2 text-right font-medium">
                    Reversals
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {fightStats.dryFights > 0 && (
                  <tr className="hover:bg-muted/30 transition-colors">
                    <td className="text-foreground px-4 py-3 font-medium">
                      Dry fights
                    </td>
                    <td className="text-muted-foreground px-4 py-3 text-right font-mono tabular-nums">
                      {fightStats.dryFights}
                    </td>
                    <td className="text-foreground px-4 py-3 text-right font-mono tabular-nums">
                      {fightStats.dryFightWinrate.toFixed(1)}%
                    </td>
                    <td className="text-muted-foreground px-4 py-3 text-right font-mono tabular-nums">
                      {fightStats.dryFightReversalRate.toFixed(1)}%
                      <span className="ml-1 text-xs">
                        ({fightStats.dryFightReversals}/{fightStats.dryFights})
                      </span>
                    </td>
                  </tr>
                )}
                {fightStats.nonDryFights > 0 && (
                  <tr className="hover:bg-muted/30 transition-colors">
                    <td className="text-foreground px-4 py-3 font-medium">
                      Ult fights
                    </td>
                    <td className="text-muted-foreground px-4 py-3 text-right font-mono tabular-nums">
                      {fightStats.nonDryFights}
                    </td>
                    <td className="text-foreground px-4 py-3 text-right font-mono tabular-nums">
                      {fightStats.avgUltsPerNonDryFight.toFixed(1)}
                      <span className="text-muted-foreground ml-1 text-xs">
                        avg
                      </span>
                    </td>
                    <td className="text-muted-foreground px-4 py-3 text-right font-mono tabular-nums">
                      {fightStats.nonDryFightReversalRate.toFixed(1)}%
                      <span className="ml-1 text-xs">
                        ({fightStats.nonDryFightReversals}/
                        {fightStats.nonDryFights})
                      </span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {fightStats.dryFights > 0 && fightStats.nonDryFights > 0 && (
            <p className="text-muted-foreground text-sm">
              {fightStats.nonDryFightReversalRate >
              fightStats.dryFightReversalRate
                ? t("reversalInsightUltReliant", {
                    nonDryRate: fightStats.nonDryFightReversalRate.toFixed(1),
                    dryRate: fightStats.dryFightReversalRate.toFixed(1),
                  })
                : t("reversalInsightMechanical", {
                    dryRate: fightStats.dryFightReversalRate.toFixed(1),
                    nonDryRate: fightStats.nonDryFightReversalRate.toFixed(1),
                  })}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
