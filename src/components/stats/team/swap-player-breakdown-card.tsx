"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import type { TeamHeroSwapStats } from "@/data/team/types";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

type SwapPlayerBreakdownCardProps = {
  swapStats: TeamHeroSwapStats;
};

function getWinrateTagClass(rate: number): string {
  if (rate >= 55) return "bg-primary/15 text-primary";
  if (rate < 45) return "bg-destructive/15 text-destructive";
  return "bg-muted text-muted-foreground";
}

export function SwapPlayerBreakdownCard({
  swapStats,
}: SwapPlayerBreakdownCardProps) {
  const t = useTranslations("teamStatsPage.swapsTab.player");

  if (swapStats.playerBreakdown.length === 0) {
    return (
      <section className="space-y-4">
        <SectionHeader
          eyebrow="Swaps · Players"
          title={t("title")}
          description={t("noData")}
        />
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow="Swaps · Players"
        title={t("title")}
        description={t("description")}
      />
      <div className="relative overflow-x-auto">
        <table className="w-full text-sm" aria-label={t("tableLabel")}>
          <thead>
            <tr className="text-muted-foreground border-border border-b font-mono text-[11px] tracking-[0.16em] uppercase">
              <th className="pr-3 pb-2 text-left font-medium">{t("player")}</th>
              <th className="pr-3 pb-2 text-right font-medium">{t("swaps")}</th>
              <th className="pr-3 pb-2 text-right font-medium">
                {t("mapsWithSwaps")}
              </th>
              <th className="pr-3 pb-2 text-right font-medium">
                {t("winrateWith")}
              </th>
              <th className="pr-3 pb-2 text-right font-medium">
                {t("winrateWithout")}
              </th>
              <th className="pb-2 text-right font-medium">{t("topPair")}</th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {swapStats.playerBreakdown.map((player) => {
              const hasSwapData = player.mapsWithSwaps > 0;
              const hasNoSwapData = player.mapsWithoutSwaps > 0;

              return (
                <tr key={player.playerName}>
                  <td className="text-foreground py-2.5 pr-3 font-medium">
                    {player.playerName}
                  </td>
                  <td className="text-foreground py-2.5 pr-3 text-right font-mono font-medium tabular-nums">
                    {player.totalSwaps}
                  </td>
                  <td className="text-muted-foreground py-2.5 pr-3 text-right font-mono tabular-nums">
                    {player.mapsWithSwaps}
                  </td>
                  <td className="py-2.5 pr-3 text-right">
                    {hasSwapData ? (
                      <span
                        className={cn(
                          "inline-block rounded-sm px-2 py-0.5 font-mono text-[10px] tracking-[0.16em] uppercase tabular-nums",
                          getWinrateTagClass(player.winrateWithSwaps)
                        )}
                      >
                        {player.winrateWithSwaps.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-muted-foreground/60">—</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-3 text-right">
                    {hasNoSwapData ? (
                      <span
                        className={cn(
                          "inline-block rounded-sm px-2 py-0.5 font-mono text-[10px] tracking-[0.16em] uppercase tabular-nums",
                          getWinrateTagClass(player.winrateWithoutSwaps)
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
                        <span className="font-mono tabular-nums">
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
    </section>
  );
}
