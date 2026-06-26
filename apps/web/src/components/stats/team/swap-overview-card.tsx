"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import type { TeamHeroSwapStats } from "@/data/team/types";
import { cn } from "@/lib/utils";
import { useFormatter, useTranslations } from "next-intl";

type SwapOverviewCardProps = {
  swapStats: TeamHeroSwapStats;
};

export function SwapOverviewCard({ swapStats }: SwapOverviewCardProps) {
  const t = useTranslations("teamStatsPage.swapsTab.overview");
  const format = useFormatter();

  function formatPercent(value: number) {
    return format.number(value / 100, {
      maximumFractionDigits: 1,
      minimumFractionDigits: 1,
      style: "percent",
    });
  }

  function formatSeconds(seconds: number) {
    if (seconds < 60) {
      return t("durationSeconds", {
        seconds: format.number(seconds, { maximumFractionDigits: 0 }),
      });
    }

    return t("durationMinutes", {
      minutes: format.number(Math.floor(seconds / 60)),
      seconds: format.number(Math.round(seconds % 60)),
    });
  }

  if (swapStats.totalMaps === 0) {
    return (
      <section className="space-y-4">
        <SectionHeader eyebrow={t("eyebrow")} title={t("title")} />
        <p className="text-muted-foreground text-sm">{t("noData")}</p>
      </section>
    );
  }

  const delta = swapStats.swapWinrate - swapStats.noSwapWinrate;
  const noSwapTotal = swapStats.noSwapWins + swapStats.noSwapLosses;
  const swapTotal = swapStats.swapWins + swapStats.swapLosses;

  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description", { maps: swapStats.totalMaps })}
      />
      <div className="border-border grid gap-x-6 gap-y-6 divide-y divide-[var(--border)] border-y py-4 md:grid-cols-2 md:divide-x md:divide-y-0 lg:grid-cols-4">
        <div className="space-y-2 md:px-4 md:first:pl-0">
          <h4 className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
            {t("totalSwaps")}
          </h4>
          <p className="text-primary font-mono text-3xl leading-none font-bold tabular-nums">
            {format.number(swapStats.totalSwaps)}
          </p>
          <p className="text-muted-foreground text-xs">
            {t("swapsPerMap", {
              count: format.number(swapStats.swapsPerMap, {
                maximumFractionDigits: 1,
                minimumFractionDigits: 1,
              }),
            })}
          </p>
        </div>

        <div className="space-y-2 md:px-4">
          <h4 className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
            {t("noSwapWinrate")}
          </h4>
          {noSwapTotal > 0 ? (
            <>
              <p className="text-foreground font-mono text-3xl leading-none font-bold tabular-nums">
                {formatPercent(swapStats.noSwapWinrate)}
              </p>
              <p className="text-muted-foreground text-xs">
                {t("noSwapDetail", {
                  wins: format.number(swapStats.noSwapWins),
                  losses: format.number(swapStats.noSwapLosses),
                })}
              </p>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">{t("noData")}</p>
          )}
        </div>

        <div className="space-y-2 md:px-4">
          <h4 className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
            {t("swapWinrate")}
          </h4>
          {swapTotal > 0 ? (
            <>
              <p className="text-foreground font-mono text-3xl leading-none font-bold tabular-nums">
                {formatPercent(swapStats.swapWinrate)}
              </p>
              <p className="text-muted-foreground text-xs">
                {t("swapDetail", {
                  wins: format.number(swapStats.swapWins),
                  losses: format.number(swapStats.swapLosses),
                })}
              </p>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">{t("noData")}</p>
          )}
        </div>

        <div className="space-y-2 md:px-4 md:last:pr-0">
          <h4 className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
            {t("avgTimeBeforeSwap")}
          </h4>
          {swapStats.totalSwaps > 0 ? (
            <>
              <p className="text-foreground font-mono text-3xl leading-none font-bold tabular-nums">
                {formatSeconds(swapStats.avgHeroTimeBeforeSwap)}
              </p>
              <p className="text-muted-foreground text-xs">
                {t("avgTimeDetail")}
              </p>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">{t("noData")}</p>
          )}
        </div>
      </div>

      {noSwapTotal > 0 && swapTotal > 0 && (
        <p className="text-sm">
          <span className="text-muted-foreground">{t("winrateDelta")}: </span>
          <span
            className={cn(
              "rounded-sm px-2 py-0.5 font-mono text-[10px] tracking-[0.16em] uppercase",
              delta > 5
                ? "bg-primary/15 text-primary"
                : delta < -5
                  ? "bg-destructive/15 text-destructive"
                  : "bg-muted text-muted-foreground"
            )}
          >
            {delta > 0
              ? t("winrateDeltaPositive", { delta: formatPercent(delta) })
              : delta < 0
                ? t("winrateDeltaNegative", { delta: formatPercent(delta) })
                : t("winrateDeltaNeutral")}
          </span>
        </p>
      )}
    </section>
  );
}
