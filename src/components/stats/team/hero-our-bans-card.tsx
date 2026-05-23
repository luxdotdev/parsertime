"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import type { TeamOurBanAnalysis } from "@/data/team/types";
import { cn, toHero, useHeroNames } from "@/lib/utils";
import Image from "next/image";
import { useFormatter, useTranslations } from "next-intl";

type HeroOurBansCardProps = {
  outgoing: TeamOurBanAnalysis;
};

const MAX_ROWS = 10;

function formatPercent(
  value: number,
  formatter: ReturnType<typeof useFormatter>,
  digits = 0,
  showSign = false
) {
  return formatter.number(value, {
    style: "percent",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    signDisplay: showSign ? "exceptZero" : "auto",
  });
}

export function HeroOurBansCard({ outgoing }: HeroOurBansCardProps) {
  const t = useTranslations("teamStatsPage.heroBanCards");
  const formatter = useFormatter();
  const heroNames = useHeroNames();

  if (
    outgoing.totalMapsAnalyzed === 0 ||
    outgoing.mostBannedByUs.length === 0
  ) {
    return (
      <section className="space-y-4">
        <SectionHeader
          eyebrow={t("outgoing.eyebrow")}
          title={t("outgoing.title")}
        />
        <p className="text-muted-foreground text-sm">{t("outgoing.noData")}</p>
      </section>
    );
  }

  const strongBanSet = new Set(outgoing.strongBans.map((sb) => sb.hero));

  const rows = [...outgoing.mostBannedByUs]
    .sort((a, b) => b.totalBans - a.totalBans)
    .slice(0, MAX_ROWS);

  const maxBans = rows.length > 0 ? rows[0].totalBans : 1;

  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow={t("outgoing.eyebrow")}
        title={t("outgoing.title")}
        description={t("outgoing.description", {
          maps: outgoing.totalMapsAnalyzed,
        })}
      />
      <div className="border-border overflow-hidden rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/30">
            <tr className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
              <th className="px-4 py-2 text-left font-medium">
                {t("table.hero")}
              </th>
              <th className="px-4 py-2 text-right font-medium">
                {t("table.bans")}
              </th>
              <th className="w-32 px-4 py-2 text-left font-medium">
                {t("table.distribution")}
              </th>
              <th className="px-4 py-2 text-right font-medium">
                {t("table.banRate")}
              </th>
              <th className="px-4 py-2 text-right font-medium">
                {t("table.wrBanned")}
              </th>
              <th className="px-4 py-2 text-right font-medium">
                {t("table.wrNotBanned")}
              </th>
              <th className="px-4 py-2 text-right font-medium">
                {t("table.wrDelta")}
              </th>
              <th className="w-28 px-4 py-2 text-right font-medium">
                {t("table.tag")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {rows.map((impact) => {
              const heroSlug = toHero(impact.hero);
              const displayName = heroNames.get(heroSlug) ?? impact.hero;
              const deltaValue = impact.winRateDelta;
              const isStrongBan = strongBanSet.has(impact.hero);

              return (
                <tr
                  key={impact.hero}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="border-border relative h-9 w-9 shrink-0 overflow-hidden rounded border">
                        <Image
                          src={`/heroes/${heroSlug}.png`}
                          alt={displayName}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <span className="font-medium">{displayName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">
                    {formatter.number(impact.totalBans)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="bg-muted h-1.5 w-full max-w-[120px] overflow-hidden rounded-full">
                      <div
                        className="bg-primary/60 h-full"
                        style={{
                          width: `${(impact.totalBans / maxBans) * 100}%`,
                        }}
                      />
                    </div>
                  </td>
                  <td className="text-muted-foreground px-4 py-3 text-right font-mono tabular-nums">
                    {formatPercent(impact.banRate, formatter, 1)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">
                    {formatPercent(impact.winRateWhenBanned, formatter)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">
                    {formatPercent(impact.winRateWhenNotBanned, formatter)}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3 text-right font-mono font-semibold tabular-nums",
                      deltaValue > 0 && "text-primary",
                      deltaValue < 0 && "text-destructive",
                      deltaValue === 0 && "text-muted-foreground"
                    )}
                  >
                    {formatPercent(deltaValue, formatter, 1, true)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isStrongBan ? (
                      <span className="bg-primary/15 text-primary rounded-sm px-2 py-0.5 font-mono text-[10px] tracking-[0.16em] uppercase">
                        {t("tags.highValue")}
                      </span>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
