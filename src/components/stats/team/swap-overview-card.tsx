"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TeamHeroSwapStats } from "@/data/team-hero-swap-dto";
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

function getWinrateDeltaColor(delta: number): string {
  if (delta > 5) return "text-green-600 dark:text-green-400";
  if (delta < -5) return "text-red-600 dark:text-red-400";
  return "text-muted-foreground";
}

function getWinrateColor(rate: number): string {
  if (rate >= 55) return "text-green-600 dark:text-green-400";
  if (rate >= 45) return "text-blue-600 dark:text-blue-400";
  return "text-red-600 dark:text-red-400";
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
            <h4 className="text-muted-foreground text-sm font-medium">
              {t("totalSwaps")}
            </h4>
            <p className="text-3xl font-bold tabular-nums">
              {swapStats.totalSwaps}
            </p>
            <p className="text-muted-foreground text-xs">
              {t("swapsPerMap", {
                count: swapStats.swapsPerMap.toFixed(1),
              })}
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="text-muted-foreground text-sm font-medium">
              {t("noSwapWinrate")}
            </h4>
            {noSwapTotal > 0 ? (
              <>
                <p
                  className={cn(
                    "text-3xl font-bold tabular-nums",
                    getWinrateColor(swapStats.noSwapWinrate)
                  )}
                >
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
            <h4 className="text-muted-foreground text-sm font-medium">
              {t("swapWinrate")}
            </h4>
            {swapTotal > 0 ? (
              <>
                <p
                  className={cn(
                    "text-3xl font-bold tabular-nums",
                    getWinrateColor(swapStats.swapWinrate)
                  )}
                >
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
            <h4 className="text-muted-foreground text-sm font-medium">
              {t("avgTimeBeforeSwap")}
            </h4>
            {swapStats.totalSwaps > 0 ? (
              <>
                <p className="text-3xl font-bold tabular-nums">
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
                className={cn("font-semibold", getWinrateDeltaColor(delta))}
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
