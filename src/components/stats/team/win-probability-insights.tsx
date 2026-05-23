"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import type { TeamFightStats } from "@/data/team/types";
import { cn } from "@/lib/utils";
import { useFormatter, useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import type {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";

type WinProbabilityInsightsProps = {
  fightStats: TeamFightStats;
};

type InsightTone = "positive" | "negative" | "neutral";

type Insight = {
  eyebrow: string;
  headline: string;
  detail: string;
  tone: InsightTone;
};

type FightTypeRow = {
  label: string;
  winrate: number;
  fights: number;
  color: string;
};

type ChartTooltipProps = TooltipProps<ValueType, NameType> & {
  formatPercent: (value: number) => string;
  summary: (values: { winrate: string; fights: number }) => string;
};

function toneFromDelta(delta: number, threshold = 5): InsightTone {
  if (delta >= threshold) return "positive";
  if (delta <= -threshold) return "negative";
  return "neutral";
}

function ChartTooltip({
  active,
  payload,
  formatPercent,
  summary,
}: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload as FightTypeRow | undefined;
  if (!row) return null;
  return (
    <div className="bg-popover text-popover-foreground border-border z-50 overflow-hidden rounded-md border px-3 py-2 shadow-xl">
      <p className="text-xs font-semibold">{row.label}</p>
      <p className="text-foreground font-mono text-xs tabular-nums">
        {summary({
          winrate: formatPercent(row.winrate),
          fights: row.fights,
        })}
      </p>
    </div>
  );
}

export function WinProbabilityInsights({
  fightStats,
}: WinProbabilityInsightsProps) {
  const t = useTranslations("teamStatsPage.winProbabilityInsights");
  const format = useFormatter();

  function formatPercent(value: number, maximumFractionDigits = 1): string {
    return format.number(value / 100, {
      style: "percent",
      minimumFractionDigits: maximumFractionDigits,
      maximumFractionDigits,
    });
  }

  function formatDelta(value: number): string {
    return format.number(value, {
      signDisplay: "exceptZero",
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
  }

  if (fightStats.totalFights === 0) {
    return (
      <section className="space-y-4">
        <SectionHeader eyebrow={t("eyebrow")} title={t("title")} />
        <p className="text-muted-foreground text-sm">{t("noData")}</p>
      </section>
    );
  }

  const overall = fightStats.overallWinrate;
  const insights: Insight[] = [];

  if (fightStats.firstPickFights > 0) {
    const delta = fightStats.firstPickWinrate - overall;
    insights.push({
      eyebrow: t("firstPickImpact"),
      headline: t("firstPickHeadline", {
        winrate: formatPercent(fightStats.firstPickWinrate),
      }),
      detail: t("firstPickDetail", {
        wins: fightStats.firstPickWins,
        fights: fightStats.firstPickFights,
        delta: formatDelta(delta),
      }),
      tone: toneFromDelta(delta),
    });
  }

  if (fightStats.firstDeathFights > 0) {
    const delta = fightStats.firstDeathWinrate - overall;
    insights.push({
      eyebrow: t("firstDeathComeback"),
      headline: t("firstDeathHeadline", {
        winrate: formatPercent(fightStats.firstDeathWinrate),
      }),
      detail: t("firstDeathDetail", {
        wins: fightStats.firstDeathWins,
        fights: fightStats.firstDeathFights,
        delta: formatDelta(delta),
      }),
      tone: toneFromDelta(delta),
    });
  }

  if (fightStats.firstUltFights > 0) {
    const delta = fightStats.firstUltWinrate - overall;
    insights.push({
      eyebrow: t("ultimateAdvantage"),
      headline: t("firstUltHeadline", {
        winrate: formatPercent(fightStats.firstUltWinrate),
      }),
      detail: t("firstUltDetail", {
        wins: fightStats.firstUltWins,
        fights: fightStats.firstUltFights,
        delta: formatDelta(delta),
      }),
      tone: toneFromDelta(delta),
    });
  }

  if (fightStats.dryFights > 0) {
    const delta = fightStats.dryFightWinrate - overall;
    insights.push({
      eyebrow: t("dryFightSuccess"),
      headline: t("dryFightHeadline", {
        winrate: formatPercent(fightStats.dryFightWinrate),
      }),
      detail: t("dryFightDetail", {
        wins: fightStats.dryFightWins,
        fights: fightStats.dryFights,
        delta: formatDelta(delta),
      }),
      tone: toneFromDelta(delta),
    });
  }

  if (fightStats.avgUltsInWonFights > 0 || fightStats.avgUltsInLostFights > 0) {
    const diff = fightStats.avgUltsInWonFights - fightStats.avgUltsInLostFights;
    insights.push({
      eyebrow: t("ultEconomy"),
      headline: t("ultEconomyHeadline", {
        count: format.number(fightStats.avgUltsInWonFights, {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        }),
      }),
      detail: t("ultEconomyDetail", {
        count: format.number(fightStats.avgUltsInLostFights, {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        }),
        delta: formatDelta(diff),
      }),
      tone: toneFromDelta(-diff, 0.5),
    });
  }

  if (fightStats.dryFights > 0 && fightStats.nonDryFights > 0) {
    const dry = fightStats.dryFightReversalRate;
    const wet = fightStats.nonDryFightReversalRate;
    const higher = Math.max(dry, wet);
    insights.push({
      eyebrow: t("fightReversalComparison"),
      headline: t("fightReversalHeadline", {
        dryRate: formatPercent(dry, 0),
        ultRate: formatPercent(wet, 0),
      }),
      detail: t("fightReversalDetail", {
        dryReversals: fightStats.dryFightReversals,
        ultReversals: fightStats.nonDryFightReversals,
      }),
      tone: higher > 15 ? "positive" : higher < 5 ? "negative" : "neutral",
    });
  }

  const fightTypeRows: FightTypeRow[] = [
    {
      label: t("rows.overall"),
      winrate: overall,
      fights: fightStats.totalFights,
      color: "var(--chart-1)",
    },
  ];
  if (fightStats.firstPickFights > 0) {
    fightTypeRows.push({
      label: t("rows.firstPick"),
      winrate: fightStats.firstPickWinrate,
      fights: fightStats.firstPickFights,
      color: "var(--chart-2)",
    });
  }
  if (fightStats.firstDeathFights > 0) {
    fightTypeRows.push({
      label: t("rows.firstDeath"),
      winrate: fightStats.firstDeathWinrate,
      fights: fightStats.firstDeathFights,
      color: "var(--chart-3)",
    });
  }
  if (fightStats.firstUltFights > 0) {
    fightTypeRows.push({
      label: t("rows.firstUlt"),
      winrate: fightStats.firstUltWinrate,
      fights: fightStats.firstUltFights,
      color: "var(--chart-4)",
    });
  }
  if (fightStats.dryFights > 0) {
    fightTypeRows.push({
      label: t("rows.dry"),
      winrate: fightStats.dryFightWinrate,
      fights: fightStats.dryFights,
      color: "var(--chart-5)",
    });
  }
  if (fightStats.nonDryFights > 0) {
    const wins =
      fightStats.fightsWon -
      (fightStats.dryFights > 0 ? fightStats.dryFightWins : 0);
    const wr =
      fightStats.nonDryFights > 0 ? (wins / fightStats.nonDryFights) * 100 : 0;
    fightTypeRows.push({
      label: t("rows.withUlts"),
      winrate: wr,
      fights: fightStats.nonDryFights,
      color: "var(--chart-2)",
    });
  }

  const chartHeight = Math.max(220, fightTypeRows.length * 36);

  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />
      <div className="grid gap-x-10 gap-y-8 lg:grid-cols-12">
        <div className="lg:col-span-7">
          {insights.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("noData")}</p>
          ) : (
            <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
              {insights.map((ins) => (
                <div key={ins.eyebrow} className="space-y-1">
                  <dt
                    className={cn(
                      "font-mono text-[10px] tracking-[0.18em] uppercase",
                      ins.tone === "positive"
                        ? "text-primary"
                        : ins.tone === "negative"
                          ? "text-destructive"
                          : "text-muted-foreground"
                    )}
                  >
                    {ins.eyebrow}
                  </dt>
                  <dd className="text-foreground text-base leading-tight font-medium">
                    {ins.headline}
                  </dd>
                  <dd className="text-muted-foreground font-mono text-xs tabular-nums">
                    {ins.detail}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
        <div className="lg:col-span-5">
          <p className="text-muted-foreground mb-3 font-mono text-[10px] tracking-[0.18em] uppercase">
            {t("chartTitle")}
          </p>
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart
              data={fightTypeRows}
              layout="vertical"
              margin={{ top: 0, right: 24, bottom: 0, left: 0 }}
            >
              <XAxis
                type="number"
                domain={[0, 100]}
                tick={{
                  fontSize: 10,
                  fill: "var(--muted-foreground)",
                  fontFamily: "var(--font-mono)",
                }}
                tickFormatter={(v) => formatPercent(Number(v), 0)}
                axisLine={{ stroke: "var(--border)" }}
                tickLine={{ stroke: "var(--border)" }}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={80}
                tick={{
                  fontSize: 10,
                  fill: "var(--muted-foreground)",
                  fontFamily: "var(--font-mono)",
                }}
                axisLine={{ stroke: "var(--border)" }}
                tickLine={false}
              />
              <Tooltip
                content={
                  <ChartTooltip
                    formatPercent={formatPercent}
                    summary={(values) => t("tooltipSummary", values)}
                  />
                }
                cursor={{ fill: "var(--muted)", fillOpacity: 0.4 }}
              />
              <Bar dataKey="winrate" radius={[0, 2, 2, 0]}>
                {fightTypeRows.map((row) => (
                  <Cell key={row.label} fill={row.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
