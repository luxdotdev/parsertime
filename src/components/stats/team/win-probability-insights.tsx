"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import type { TeamFightStats } from "@/data/team/types";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
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

function toneFromDelta(delta: number, threshold = 5): InsightTone {
  if (delta >= threshold) return "positive";
  if (delta <= -threshold) return "negative";
  return "neutral";
}

function ChartTooltip({ active, payload }: TooltipProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload as FightTypeRow | undefined;
  if (!row) return null;
  return (
    <div className="bg-popover text-popover-foreground border-border z-50 overflow-hidden rounded-md border px-3 py-2 shadow-xl">
      <p className="text-xs font-semibold">{row.label}</p>
      <p className="text-foreground font-mono text-xs tabular-nums">
        {row.winrate.toFixed(1)}% over {row.fights} fights
      </p>
    </div>
  );
}

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

  const overall = fightStats.overallWinrate;
  const insights: Insight[] = [];

  if (fightStats.firstPickFights > 0) {
    const delta = fightStats.firstPickWinrate - overall;
    insights.push({
      eyebrow: t("firstPickImpact"),
      headline: `${fightStats.firstPickWinrate.toFixed(1)}% with first pick`,
      detail: `${fightStats.firstPickWins}W of ${fightStats.firstPickFights} (${delta >= 0 ? "+" : ""}${delta.toFixed(1)} vs overall)`,
      tone: toneFromDelta(delta),
    });
  }

  if (fightStats.firstDeathFights > 0) {
    const delta = fightStats.firstDeathWinrate - overall;
    insights.push({
      eyebrow: t("firstDeathComeback"),
      headline: `${fightStats.firstDeathWinrate.toFixed(1)}% after first death`,
      detail: `${fightStats.firstDeathWins}W of ${fightStats.firstDeathFights} (${delta >= 0 ? "+" : ""}${delta.toFixed(1)} vs overall)`,
      tone: toneFromDelta(delta),
    });
  }

  if (fightStats.firstUltFights > 0) {
    const delta = fightStats.firstUltWinrate - overall;
    insights.push({
      eyebrow: t("ultimateAdvantage"),
      headline: `${fightStats.firstUltWinrate.toFixed(1)}% on first ult`,
      detail: `${fightStats.firstUltWins}W of ${fightStats.firstUltFights} (${delta >= 0 ? "+" : ""}${delta.toFixed(1)} vs overall)`,
      tone: toneFromDelta(delta),
    });
  }

  if (fightStats.dryFights > 0) {
    const delta = fightStats.dryFightWinrate - overall;
    insights.push({
      eyebrow: t("dryFightSuccess"),
      headline: `${fightStats.dryFightWinrate.toFixed(1)}% in dry fights`,
      detail: `${fightStats.dryFightWins}W of ${fightStats.dryFights} dry fights (${delta >= 0 ? "+" : ""}${delta.toFixed(1)} vs overall)`,
      tone: toneFromDelta(delta),
    });
  }

  if (fightStats.avgUltsInWonFights > 0 || fightStats.avgUltsInLostFights > 0) {
    const diff = fightStats.avgUltsInWonFights - fightStats.avgUltsInLostFights;
    insights.push({
      eyebrow: "Ult economy",
      headline: `${fightStats.avgUltsInWonFights.toFixed(1)} ults per won fight`,
      detail: `${fightStats.avgUltsInLostFights.toFixed(1)} per lost fight (${diff >= 0 ? "+" : ""}${diff.toFixed(1)} delta)`,
      tone: toneFromDelta(-diff, 0.5),
    });
  }

  if (fightStats.dryFights > 0 && fightStats.nonDryFights > 0) {
    const dry = fightStats.dryFightReversalRate;
    const wet = fightStats.nonDryFightReversalRate;
    const higher = Math.max(dry, wet);
    insights.push({
      eyebrow: t("fightReversalComparison"),
      headline: `${dry.toFixed(0)}% dry, ${wet.toFixed(0)}% with ults reverse`,
      detail: `${fightStats.dryFightReversals} dry, ${fightStats.nonDryFightReversals} ult reversals`,
      tone: higher > 15 ? "positive" : higher < 5 ? "negative" : "neutral",
    });
  }

  const fightTypeRows: FightTypeRow[] = [
    {
      label: "Overall",
      winrate: overall,
      fights: fightStats.totalFights,
      color: "var(--chart-1)",
    },
  ];
  if (fightStats.firstPickFights > 0) {
    fightTypeRows.push({
      label: "First pick",
      winrate: fightStats.firstPickWinrate,
      fights: fightStats.firstPickFights,
      color: "var(--chart-2)",
    });
  }
  if (fightStats.firstDeathFights > 0) {
    fightTypeRows.push({
      label: "First death",
      winrate: fightStats.firstDeathWinrate,
      fights: fightStats.firstDeathFights,
      color: "var(--chart-3)",
    });
  }
  if (fightStats.firstUltFights > 0) {
    fightTypeRows.push({
      label: "First ult",
      winrate: fightStats.firstUltWinrate,
      fights: fightStats.firstUltFights,
      color: "var(--chart-4)",
    });
  }
  if (fightStats.dryFights > 0) {
    fightTypeRows.push({
      label: "Dry",
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
      label: "With ults",
      winrate: wr,
      fights: fightStats.nonDryFights,
      color: "var(--chart-2)",
    });
  }

  const chartHeight = Math.max(220, fightTypeRows.length * 36);

  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow="Teamfights · Win probability"
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
            Winrate by fight type
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
                tickFormatter={(v) => `${v}%`}
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
                content={<ChartTooltip />}
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
