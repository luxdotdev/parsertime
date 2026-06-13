"use client";

import { DivergingBar, MeterBar } from "@/components/faceit/viz";
import { SectionHeader } from "@/components/stats/team/section-header";
import type { HeroBanIntelligence, HeroExposure } from "@/data/intelligence/types";
import type { HeroBanEntry, ScoutingHeroBans } from "@/data/scouting/types";
import { cn } from "@/lib/utils";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

type Props = {
  heroBans: ScoutingHeroBans;
  banIntelligence: HeroBanIntelligence;
  hasUserTeamLink: boolean;
};

const DELTA_MAGNITUDE = 40;
const DISRUPTION_INITIAL = 6;
const BAN_LIST_LIMIT = 6;

const RISK_ORDER: Record<HeroExposure["exposureRisk"], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export function ScoutingHeroBans({
  heroBans,
  banIntelligence,
  hasUserTeamLink,
}: Props) {
  const t = useTranslations("scoutingPage.team.heroBans");
  const format = useFormatter();
  const [showAllDisruption, setShowAllDisruption] = useState(false);

  function pct(value: number): string {
    return format.number(value / 100, {
      style: "percent",
      maximumFractionDigits: 0,
    });
  }

  const disruption = banIntelligence.banDisruptionRanking
    .filter((entry) => entry.confidence.level !== "insufficient")
    .sort((a, b) => b.disruptionScore - a.disruptionScore);
  const visibleDisruption = showAllDisruption
    ? disruption
    : disruption.slice(0, DISRUPTION_INITIAL);
  const hiddenDisruption = disruption.length - DISRUPTION_INITIAL;

  const exposure = banIntelligence.heroExposure
    .slice()
    .sort(
      (a, b) =>
        RISK_ORDER[a.exposureRisk] - RISK_ORDER[b.exposureRisk] ||
        b.opponentBanRate - a.opponentBanRate
    );

  const protectedHeroes = banIntelligence.protectedHeroes;

  return (
    <section className="space-y-8">
      <SectionHeader eyebrow={t("eyebrow")} title={t("title")} />

      {/* Disruption targets — the opponent's reliance heroes = your best bans */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
            {t("disruptionTargets")}
          </p>
          <p className="text-muted-foreground text-xs">
            {t("disruptionTargetsDescription")}
          </p>
        </div>

        {disruption.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {t("notEnoughBanData")}
          </p>
        ) : (
          <>
            <div className="border-border overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
                    <th className="px-4 py-2 text-left font-medium">
                      {t("hero")}
                    </th>
                    <th
                      className="hidden w-36 px-4 py-2 text-left font-medium sm:table-cell"
                      aria-hidden="true"
                    />
                    <th className="px-4 py-2 text-right font-medium">
                      {t("delta")}
                    </th>
                    <th className="hidden px-4 py-2 text-right font-medium md:table-cell">
                      {t("count")}
                    </th>
                    <th className="px-4 py-2 text-right font-medium">
                      {t("weighted")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {visibleDisruption.map((entry) => {
                    const positive = entry.winRateDelta > 0;
                    return (
                      <tr
                        key={entry.hero}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <span className="text-foreground font-medium">
                            {entry.hero}
                          </span>
                        </td>
                        <td className="hidden px-4 py-3 sm:table-cell">
                          <DivergingBar
                            value={entry.winRateDelta}
                            magnitude={DELTA_MAGNITUDE}
                            positiveTone="primary"
                            negativeTone="muted"
                          />
                        </td>
                        <td
                          className={cn(
                            "px-4 py-3 text-right font-mono font-semibold tabular-nums",
                            positive
                              ? "text-primary"
                              : "text-muted-foreground"
                          )}
                        >
                          {t("percentagePoints", {
                            value: `${positive ? "+" : ""}${Math.round(
                              entry.winRateDelta
                            )}`,
                          })}
                        </td>
                        <td className="text-muted-foreground hidden px-4 py-3 text-right font-mono text-xs tabular-nums md:table-cell">
                          {t("availabilitySummary", {
                            available: entry.mapsAvailable,
                            banned: entry.mapsBanned,
                          })}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums">
                          {format.number(entry.disruptionScore, {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1,
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {hiddenDisruption > 0 ? (
              <button
                type="button"
                onClick={() => setShowAllDisruption((v) => !v)}
                className="text-muted-foreground hover:text-foreground font-mono text-[11px] tracking-[0.16em] uppercase transition-colors"
              >
                {showAllDisruption
                  ? t("showFewer")
                  : t("showMore", { count: hiddenDisruption })}
              </button>
            ) : null}
          </>
        )}
      </div>

      {/* Bans against them vs their bans */}
      <div className="grid gap-6 sm:grid-cols-2">
        <BanList
          label={t("bansAgainstTeam")}
          description={t("bansAgainstDescription")}
          entries={heroBans.bansAgainstTeam}
          tone="primary"
          emptyLabel={t("noBans")}
          countLabel={t("count")}
        />
        <BanList
          label={t("bansByTeam")}
          description={t("bansByDescription")}
          entries={heroBans.bansByTeam}
          tone="muted"
          emptyLabel={t("noBans")}
          countLabel={t("count")}
        />
      </div>

      {/* Your exposure — only when a user team is linked */}
      {hasUserTeamLink ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
              {t("theirBanTargets")}
            </p>
            <p className="text-muted-foreground text-xs">
              {t("theirBanTargetsDescription")}
            </p>
          </div>

          {exposure.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {t("noBanTargetOverlap")}
            </p>
          ) : (
            <ul className="divide-y divide-[var(--border)] border-border overflow-hidden rounded-md border">
              {exposure.map((entry) => {
                const risk = riskMeta(entry.exposureRisk);
                return (
                  <li
                    key={entry.hero}
                    className="hover:bg-muted/30 flex flex-wrap items-baseline gap-x-2 gap-y-1 px-4 py-3 transition-colors"
                  >
                    <span className="text-foreground font-medium">
                      {entry.hero}
                    </span>
                    <span
                      className={cn(
                        "rounded-sm px-1.5 py-0.5 font-mono text-[9px] tracking-[0.14em] uppercase",
                        risk.className
                      )}
                    >
                      {t(risk.labelKey)}
                    </span>
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {t("exposureSummary", {
                        opponentBanRate: pct(entry.opponentBanRate),
                        userPlayRate: pct(entry.userPlayRate),
                      })}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : (
        <div className="border-border rounded-md border border-dashed px-4 py-6">
          <p className="text-foreground text-sm font-medium">
            {t("selectTeamTitle")}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("selectTeamDescription")}
          </p>
        </div>
      )}

      {/* Protected heroes */}
      {protectedHeroes.length > 0 ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
              {t("protectedHeroes")}
            </p>
            <p className="text-muted-foreground text-xs">
              {t("protectedHeroesDescription")}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {protectedHeroes.map((hero) => (
              <span
                key={hero.hero}
                className="border-border rounded-sm border px-1.5 py-0.5 font-mono text-[11px]"
              >
                <span className="text-foreground">{hero.hero}</span>
                <span className="text-muted-foreground ml-1.5 tabular-nums">
                  {pct(hero.banRate)}
                </span>
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function BanList({
  label,
  description,
  entries,
  tone,
  emptyLabel,
  countLabel,
}: {
  label: string;
  description: string;
  entries: HeroBanEntry[];
  tone: "primary" | "muted";
  emptyLabel: string;
  countLabel: string;
}) {
  const visible = entries.slice(0, BAN_LIST_LIMIT);
  const max = visible.reduce((m, e) => Math.max(m, e.weightedCount), 0);

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
          {label}
        </p>
        <p className="text-muted-foreground text-xs">{description}</p>
      </div>

      {visible.length === 0 ? (
        <p className="text-muted-foreground text-sm">{emptyLabel}</p>
      ) : (
        <ul
          className="divide-y divide-[var(--border)] border-border overflow-hidden rounded-md border"
          aria-label={label}
        >
          {visible.map((entry) => (
            <li
              key={entry.hero}
              className="hover:bg-muted/30 flex items-center gap-3 px-4 py-2.5 transition-colors"
            >
              <span className="text-foreground w-28 shrink-0 truncate text-sm font-medium">
                {entry.hero}
              </span>
              <MeterBar
                value={entry.weightedCount}
                max={max}
                tone={tone}
                className="flex-1"
              />
              <span
                className="text-muted-foreground w-8 shrink-0 text-right font-mono text-xs tabular-nums"
                aria-label={countLabel}
              >
                {entry.rawCount}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function riskMeta(risk: HeroExposure["exposureRisk"]): {
  labelKey: "riskCritical" | "riskWatch" | "riskSafe";
  className: string;
} {
  switch (risk) {
    case "high":
      return {
        labelKey: "riskCritical",
        className: "bg-destructive/15 text-destructive",
      };
    case "medium":
      return {
        labelKey: "riskWatch",
        className: "bg-primary/10 text-primary/80",
      };
    case "low":
    default:
      return {
        labelKey: "riskSafe",
        className: "bg-muted text-muted-foreground",
      };
  }
}
