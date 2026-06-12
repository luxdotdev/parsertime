"use client";

import { useTranslations } from "next-intl";
import { SectionHeader } from "@/components/stats/team/section-header";
import {
  ONE_TRICK_THRESHOLD,
  SPECIALIST_THRESHOLD,
  type OneTrickResult,
} from "@/lib/ranked-stats";

type OneTrickDetectionCardProps = {
  result: OneTrickResult;
};

const LABEL_STYLES: Record<
  OneTrickResult["label"],
  { bg: string; text: string }
> = {
  "One-Trick": {
    bg: "bg-destructive/15",
    text: "text-destructive",
  },
  Specialist: {
    bg: "bg-primary/15",
    text: "text-primary",
  },
  Diverse: {
    bg: "bg-muted",
    text: "text-muted-foreground",
  },
};

const ROLE_COLORS: Record<string, string> = {
  Tank: "var(--chart-1)",
  Damage: "var(--chart-2)",
  Support: "var(--chart-3)",
};

export function OneTrickDetectionCard({ result }: OneTrickDetectionCardProps) {
  const t = useTranslations("ranked.charts.oneTrick");
  const { topHero, topHeroPct, label, topHeroesData } = result;
  const hasData = topHeroesData.length > 0;
  const labelStyle = LABEL_STYLES[label];

  const description = !hasData
    ? t("descriptionEmpty")
    : label === "One-Trick"
      ? t("descriptionOneTrick", { hero: topHero, pct: topHeroPct })
      : label === "Specialist"
        ? t("descriptionSpecialist", { hero: topHero })
        : t("descriptionDiverse");

  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={description}
      />
      {hasData ? (
          <div className="flex flex-col gap-5">
            <div className="flex items-baseline gap-3">
              <span className="text-5xl font-bold tabular-nums">
                {topHeroPct}%
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${labelStyle.bg} ${labelStyle.text}`}
              >
                {t(`labels.${label}`)}
              </span>
            </div>
            <div className="flex flex-col gap-2" role="list" aria-label={t("breakdownAriaLabel")}>
              {topHeroesData.map((entry, i) => {
                const isTop = i === 0;
                const barColor = isTop
                  ? (ROLE_COLORS[entry.role] ?? "var(--chart-1)")
                  : "var(--muted-foreground)";
                const barOpacity = isTop ? 1 : 0.35;
                return (
                  <div key={entry.hero} className="flex items-center gap-2" role="listitem">
                    <span
                      className="w-24 shrink-0 truncate text-sm tabular-nums"
                      title={entry.hero}
                    >
                      {entry.hero}
                    </span>
                    <div className="relative flex-1 overflow-hidden rounded-sm h-5">
                      <div
                        className="absolute inset-y-0 left-0 rounded-sm transition-[width]"
                        style={{
                          width: `${entry.pct}%`,
                          backgroundColor: barColor,
                          opacity: barOpacity,
                        }}
                        aria-hidden="true"
                      />
                    </div>
                    <span
                      className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground"
                      aria-label={t("percentAriaLabel", { pct: entry.pct })}
                    >
                      {entry.pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
      ) : (
        <div className="flex h-[200px] items-center justify-center">
          <p className="text-muted-foreground text-sm">{t("noData")}</p>
        </div>
      )}
      {hasData && (
        <p className="text-muted-foreground text-xs">
          {t("footer", {
            oneTrick: ONE_TRICK_THRESHOLD,
            specialist: SPECIALIST_THRESHOLD,
          })}
        </p>
      )}
    </section>
  );
}
