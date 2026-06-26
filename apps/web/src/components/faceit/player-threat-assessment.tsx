"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import { FsrExplainer } from "@/components/faceit/fsr-explainer";
import { MeterBar } from "@/components/faceit/viz";
import type {
  FaceitPlayerProfile,
  PlayerFsrRole,
} from "@/data/faceit/player-types";
import type { MapWinrateEntry } from "@/data/faceit/types";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

type Props = {
  rated: boolean;
  roles: PlayerFsrRole[];
  byMap: MapWinrateEntry[];
  matchHistory: FaceitPlayerProfile["matchHistory"];
};

const FSR_CEILING = 5000;

type Insight = {
  key: string;
  eyebrow: string;
  headline: string;
  detail?: string;
  tone: "positive" | "negative" | "neutral";
};

export function PlayerThreatAssessment({
  rated,
  roles,
  byMap,
  matchHistory,
}: Props) {
  const t = useTranslations("faceitPlayerPage.threat");
  const tStat = useTranslations("faceitPlayerPage.stat");

  const primary = roles.find((r) => r.primary) ?? roles[0] ?? null;
  const headlineCell =
    primary?.tiers.find((c) => c.tier === primary.headlineTier) ??
    primary?.tiers[0] ??
    null;

  const ratedMaps = byMap.filter((m) => m.rated);
  const bestMap = ratedMaps.reduce<MapWinrateEntry | null>(
    (best, m) => (best == null || m.winRate > best.winRate ? m : best),
    null
  );
  const worstMap = ratedMaps.reduce<MapWinrateEntry | null>(
    (worst, m) => (worst == null || m.winRate < worst.winRate ? m : worst),
    null
  );

  const wins = matchHistory.filter((m) => m.won).length;
  const losses = matchHistory.length - wins;

  const insights: Insight[] = [];

  if (rated && primary) {
    const strength = primary.strengths[0];
    const second = primary.strengths[1];
    if (strength) {
      insights.push({
        key: "threat",
        eyebrow: t("threatensWith"),
        headline: [strength.stat, second?.stat]
          .filter((s): s is string => Boolean(s))
          .map((s) => tStat(s))
          .join(" · "),
        detail: t("zAbove", { z: strength.z.toFixed(1) }),
        tone: "positive",
      });
    }
    const weakness = primary.weaknesses[0];
    const weakness2 = primary.weaknesses[1];
    if (weakness) {
      insights.push({
        key: "exploit",
        eyebrow: t("exploit"),
        headline: [weakness.stat, weakness2?.stat]
          .filter((s): s is string => Boolean(s))
          .map((s) => tStat(s))
          .join(" · "),
        detail: t("zBelow", { z: weakness.z.toFixed(1) }),
        tone: "negative",
      });
    }
  }

  if (bestMap) {
    insights.push({
      key: "bestMap",
      eyebrow: t("strongestMap"),
      headline: bestMap.key,
      detail: t("mapDetail", {
        winRate: Math.round(bestMap.winRate),
        played: bestMap.played,
      }),
      tone: "positive",
    });
  }
  if (worstMap && worstMap.key !== bestMap?.key) {
    insights.push({
      key: "worstMap",
      eyebrow: t("weakestMap"),
      headline: worstMap.key,
      detail: t("mapDetail", {
        winRate: Math.round(worstMap.winRate),
        played: worstMap.played,
      }),
      tone: "negative",
    });
  }
  if (matchHistory.length > 0) {
    insights.push({
      key: "record",
      eyebrow: t("trackedRecord"),
      headline: `${wins}–${losses}`,
      detail: t("matchesTracked", { count: matchHistory.length }),
      tone: "neutral",
    });
  }

  return (
    <section className="space-y-5">
      <SectionHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        rightSlot={<FsrExplainer />}
      />
      <div className="grid gap-x-10 gap-y-8 lg:grid-cols-12">
        <div className="lg:col-span-5">
          {rated && primary && headlineCell ? (
            <div className="border-border space-y-3 border-y py-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-muted-foreground font-mono text-[10px] tracking-[0.18em] uppercase">
                  {t("headlineRating", { role: primary.role })}
                </span>
                <span className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
                  {headlineCell.tier}
                </span>
              </div>
              <div className="flex items-end gap-3">
                <span className="text-primary font-mono text-5xl leading-none font-semibold tabular-nums">
                  {primary.fsr}
                </span>
                <span className="text-muted-foreground mb-1 font-mono text-xs tabular-nums">
                  / {FSR_CEILING}
                </span>
              </div>
              <MeterBar value={primary.fsr} max={FSR_CEILING} />
              <p className="text-muted-foreground text-sm">
                {t("percentile", {
                  pct: Math.round(headlineCell.percentile),
                  tier: headlineCell.tier,
                  role: primary.role,
                })}
              </p>
            </div>
          ) : (
            <div className="border-border space-y-2 border-y py-4">
              <span className="text-muted-foreground font-mono text-[10px] tracking-[0.18em] uppercase">
                {t("unratedEyebrow")}
              </span>
              <p className="text-foreground text-2xl font-semibold">
                {t("unratedTitle")}
              </p>
              <p className="text-muted-foreground text-sm">
                {t("unratedBody")}
              </p>
            </div>
          )}
        </div>
        <div className="lg:col-span-7">
          {insights.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("noInsights")}</p>
          ) : (
            <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
              {insights.map((ins) => (
                <div key={ins.key} className="space-y-1">
                  <dt
                    className={cn(
                      "font-mono text-[10px] tracking-[0.18em] uppercase",
                      ins.tone === "negative"
                        ? "text-destructive"
                        : ins.tone === "positive"
                          ? "text-primary"
                          : "text-muted-foreground"
                    )}
                  >
                    {ins.eyebrow}
                  </dt>
                  <dd className="text-foreground text-base leading-tight font-medium">
                    {ins.headline}
                  </dd>
                  {ins.detail ? (
                    <dd className="text-muted-foreground font-mono text-xs tabular-nums">
                      {ins.detail}
                    </dd>
                  ) : null}
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </section>
  );
}
