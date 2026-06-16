"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import type { StreakInfo } from "@/data/team/types";
import { useFormatter, useTranslations } from "next-intl";

type WinLossStreaksCardProps = {
  streakInfo: StreakInfo;
};

type StreakTile = {
  label: string;
  value: string;
  sub: string | null;
  emphasis?: boolean;
};

export function WinLossStreaksCard({ streakInfo }: WinLossStreaksCardProps) {
  const t = useTranslations("teamStatsPage.winLossStreaksCard");
  const format = useFormatter();

  const { currentStreak, longestWinStreak, longestLossStreak } = streakInfo;

  const hasData =
    currentStreak.count > 0 ||
    longestWinStreak.count > 0 ||
    longestLossStreak.count > 0;

  if (!hasData) {
    return (
      <section className="space-y-4">
        <SectionHeader eyebrow={t("eyebrow")} title={t("title")} />
        <p className="text-muted-foreground text-sm">{t("noData")}</p>
      </section>
    );
  }

  function formatDateRange(start: Date | null, end: Date | null): string {
    if (!start || !end) return t("na");
    const startStr = format.dateTime(start, {
      month: "short",
      day: "numeric",
    });
    const endStr = format.dateTime(end, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return t("dateRange", { start: startStr, end: endStr });
  }

  const currentStreakValue =
    currentStreak.count > 0
      ? currentStreak.type === "win"
        ? t("winStreakCount", { count: currentStreak.count })
        : t("lossStreakCount", { count: currentStreak.count })
      : t("noData");

  const tiles: StreakTile[] = [
    {
      label: t("currentStreak"),
      value: currentStreakValue,
      sub: null,
      emphasis: currentStreak.count > 0,
    },
    {
      label: t("longestWinStreak"),
      value: longestWinStreak.count > 0 ? `${longestWinStreak.count}` : "—",
      sub:
        longestWinStreak.count > 0
          ? formatDateRange(
              longestWinStreak.startDate,
              longestWinStreak.endDate
            )
          : t("noWinsYet"),
    },
    {
      label: t("longestLossStreak"),
      value: longestLossStreak.count > 0 ? `${longestLossStreak.count}` : "—",
      sub:
        longestLossStreak.count > 0
          ? formatDateRange(
              longestLossStreak.startDate,
              longestLossStreak.endDate
            )
          : t("noLossesYet"),
    },
  ];

  const hint =
    currentStreak.type === "win" && currentStreak.count >= 3
      ? t("keepMomentumGoing")
      : currentStreak.type === "loss" && currentStreak.count >= 3
        ? t("timeToBreakStreak")
        : null;

  return (
    <section className="space-y-4">
      <SectionHeader eyebrow={t("eyebrow")} title={t("title")} />
      <dl className="border-border grid grid-cols-1 divide-x divide-y divide-[var(--border)] border-y sm:grid-cols-3 sm:divide-y-0">
        {tiles.map((tile) => (
          <div key={tile.label} className="flex flex-col gap-1 px-4 py-4">
            <dt className="text-muted-foreground font-mono text-[10px] tracking-[0.18em] uppercase">
              {tile.label}
            </dt>
            <dd
              className={
                tile.emphasis
                  ? "text-primary font-mono text-2xl leading-none font-semibold tabular-nums"
                  : "text-foreground font-mono text-2xl leading-none font-semibold tabular-nums"
              }
            >
              {tile.value}
            </dd>
            {tile.sub ? (
              <dd className="text-muted-foreground text-xs">{tile.sub}</dd>
            ) : null}
          </div>
        ))}
      </dl>
      {hint ? (
        <p className="text-muted-foreground text-sm font-medium">{hint}</p>
      ) : null}
    </section>
  );
}
