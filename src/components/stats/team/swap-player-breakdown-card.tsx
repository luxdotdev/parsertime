"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { TeamHeroSwapStats } from "@/data/team/types";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

type SwapPlayerBreakdownCardProps = {
  swapStats: TeamHeroSwapStats;
};

function getWinrateColor(rate: number): string {
  if (rate >= 55) return "text-green-600 dark:text-green-400";
  if (rate >= 45) return "text-blue-600 dark:text-blue-400";
  return "text-red-600 dark:text-red-400";
}

export function SwapPlayerBreakdownCard({
  swapStats,
}: SwapPlayerBreakdownCardProps) {
  const t = useTranslations("teamStatsPage.swapsTab.player");

  if (swapStats.playerBreakdown.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("noData")}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label={t("tableLabel")}>
            <thead>
              <tr className="text-muted-foreground border-b text-left text-xs">
                <th className="pb-2 font-medium">{t("player")}</th>
                <th className="pb-2 text-right font-medium">{t("swaps")}</th>
                <th className="pb-2 text-right font-medium">
                  {t("mapsWithSwaps")}
                </th>
                <th className="pb-2 text-right font-medium">
                  {t("winrateWith")}
                </th>
                <th className="pb-2 text-right font-medium">
                  {t("winrateWithout")}
                </th>
                <th className="pb-2 text-right font-medium">{t("topPair")}</th>
              </tr>
            </thead>
            <tbody>
              {swapStats.playerBreakdown.map((player, index) => {
                const hasSwapData = player.mapsWithSwaps > 0;
                const hasNoSwapData = player.mapsWithoutSwaps > 0;

                return (
                  <tr
                    key={player.playerName}
                    className={cn(
                      "border-b last:border-b-0",
                      index === 0 && "bg-muted/50"
                    )}
                  >
                    <td className="py-2.5 font-medium">{player.playerName}</td>
                    <td className="py-2.5 text-right font-medium tabular-nums">
                      {player.totalSwaps}
                    </td>
                    <td className="text-muted-foreground py-2.5 text-right tabular-nums">
                      {player.mapsWithSwaps}
                    </td>
                    <td className="py-2.5 text-right tabular-nums">
                      {hasSwapData ? (
                        <span
                          className={getWinrateColor(player.winrateWithSwaps)}
                        >
                          {player.winrateWithSwaps.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground/60">—</span>
                      )}
                    </td>
                    <td className="py-2.5 text-right tabular-nums">
                      {hasNoSwapData ? (
                        <span
                          className={getWinrateColor(
                            player.winrateWithoutSwaps
                          )}
                        >
                          {player.winrateWithoutSwaps.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground/60">—</span>
                      )}
                    </td>
                    <td className="text-muted-foreground py-2.5 text-right">
                      {player.topSwapPair ? (
                        <span>
                          {player.topSwapPair.fromHero} →{" "}
                          {player.topSwapPair.toHero}{" "}
                          <span className="tabular-nums">
                            ({player.topSwapPairCount})
                          </span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground/60">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
