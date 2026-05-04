"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TeamHeroSwapStats } from "@/data/team/types";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

type SwapOverviewCardProps = {
  swapStats: TeamHeroSwapStats;
};

function formatSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(0)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
}

export function SwapOverviewCard({ swapStats }: SwapOverviewCardProps) {
  const t = useTranslations("teamStatsPage.swapsTab.overview");

  if (swapStats.totalMaps === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">{t("noData")}</p>
        </CardContent>
      </Card>
    );
  }

  const delta = swapStats.swapWinrate - swapStats.noSwapWinrate;
  const noSwapTotal = swapStats.noSwapWins + swapStats.noSwapLosses;
  const swapTotal = swapStats.swapWins + swapStats.swapLosses;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <p className="text-muted-foreground text-sm">
          {t("description", { maps: swapStats.totalMaps })}
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <h4 className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
              {t("totalSwaps")}
            </h4>
            <p className="text-primary font-mono text-3xl font-bold tabular-nums">
              {swapStats.totalSwaps}
            </p>
            <p className="text-muted-foreground text-xs">
              {t("swapsPerMap", {
                count: swapStats.swapsPerMap.toFixed(1),
              })}
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
              {t("noSwapWinrate")}
            </h4>
            {noSwapTotal > 0 ? (
              <>
                <p className="text-foreground font-mono text-3xl font-bold tabular-nums">
                  {swapStats.noSwapWinrate.toFixed(1)}%
                </p>
                <p className="text-muted-foreground text-xs">
                  {t("noSwapDetail", {
                    wins: swapStats.noSwapWins,
                    losses: swapStats.noSwapLosses,
                  })}
                </p>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">{t("noData")}</p>
            )}
          </div>

          <div className="space-y-2">
            <h4 className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
              {t("swapWinrate")}
            </h4>
            {swapTotal > 0 ? (
              <>
                <p className="text-foreground font-mono text-3xl font-bold tabular-nums">
                  {swapStats.swapWinrate.toFixed(1)}%
                </p>
                <p className="text-muted-foreground text-xs">
                  {t("swapDetail", {
                    wins: swapStats.swapWins,
                    losses: swapStats.swapLosses,
                  })}
                </p>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">{t("noData")}</p>
            )}
          </div>

          <div className="space-y-2">
            <h4 className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
              {t("avgTimeBeforeSwap")}
            </h4>
            {swapStats.totalSwaps > 0 ? (
              <>
                <p className="text-foreground font-mono text-3xl font-bold tabular-nums">
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
          <div className="bg-muted mt-6 rounded-lg p-3">
            <p className="text-sm">
              <span className="text-muted-foreground">
                {t("winrateDelta")}:{" "}
              </span>
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
                  ? t("winrateDeltaPositive", { delta: delta.toFixed(1) })
                  : delta < 0
                    ? t("winrateDeltaNegative", { delta: delta.toFixed(1) })
                    : t("winrateDeltaNeutral")}
              </span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
