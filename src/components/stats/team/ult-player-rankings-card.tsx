"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import type { TeamUltStats } from "@/data/team/types";
import { useTranslations } from "next-intl";

type UltPlayerRankingsCardProps = {
  ultStats: TeamUltStats;
};

export function UltPlayerRankingsCard({
  ultStats,
}: UltPlayerRankingsCardProps) {
  const t = useTranslations("teamStatsPage.ultimatesTab.playerRankings");

  if (ultStats.playerRankings.length === 0) {
    return (
      <section className="space-y-4">
        <SectionHeader
          eyebrow="Ultimates · Rankings"
          title={t("title")}
          description={t("noData")}
        />
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow="Ultimates · Rankings"
        title={t("title")}
        description={t("description")}
      />
      <div className="relative overflow-x-auto">
        <table className="w-full text-sm" aria-label={t("tableLabel")}>
          <thead>
            <tr className="text-muted-foreground border-border border-b font-mono text-[11px] tracking-[0.16em] uppercase">
              <th className="pr-3 pb-2 text-left font-medium">{t("player")}</th>
              <th className="pr-3 pb-2 text-left font-medium">{t("hero")}</th>
              <th className="pr-3 pb-2 text-right font-medium">
                {t("totalUlts")}
              </th>
              <th className="pr-3 pb-2 text-right font-medium">
                {t("mapsPlayed")}
              </th>
              <th className="pr-3 pb-2 text-right font-medium">
                {t("ultsPerMap")}
              </th>
              <th className="pb-2 text-right font-medium">
                {t("fightOpener")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {ultStats.playerRankings.map((player) => (
              <tr key={player.playerName}>
                <td className="text-foreground py-2.5 pr-3 font-medium">
                  {player.playerName}
                </td>
                <td className="text-muted-foreground py-2.5 pr-3">
                  {player.primaryHero}
                </td>
                <td className="text-foreground py-2.5 pr-3 text-right font-mono font-medium tabular-nums">
                  {player.totalUltsUsed}
                </td>
                <td className="text-muted-foreground py-2.5 pr-3 text-right font-mono tabular-nums">
                  {player.mapsPlayed}
                </td>
                <td className="text-foreground py-2.5 pr-3 text-right font-mono tabular-nums">
                  {player.ultsPerMap.toFixed(1)}
                </td>
                <td className="text-muted-foreground py-2.5 text-right">
                  {player.topFightOpeningHero ? (
                    <span>
                      {player.topFightOpeningHero}{" "}
                      <span className="font-mono tabular-nums">
                        ({player.fightOpeningCount})
                      </span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground/60">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
