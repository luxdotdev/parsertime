"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { TeamUltStats } from "@/data/team-ult-stats-dto";
import { cn } from "@/lib/utils";
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
                <th className="pb-2 font-medium">{t("hero")}</th>
                <th className="pb-2 text-right font-medium">
                  {t("totalUlts")}
                </th>
                <th className="pb-2 text-right font-medium">
                  {t("mapsPlayed")}
                </th>
                <th className="pb-2 text-right font-medium">
                  {t("ultsPerMap")}
                </th>
                <th className="pb-2 text-right font-medium">
                  {t("fightOpener")}
                </th>
              </tr>
            </thead>
            <tbody>
              {ultStats.playerRankings.map((player, index) => (
                <tr
                  key={player.playerName}
                  className={cn(
                    "border-b last:border-b-0",
                    index === 0 && "bg-muted/50"
                  )}
                >
                  <td className="py-2.5 font-medium">{player.playerName}</td>
                  <td className="text-muted-foreground py-2.5">
                    {player.primaryHero}
                  </td>
                  <td className="py-2.5 text-right font-medium tabular-nums">
                    {player.totalUltsUsed}
                  </td>
                  <td className="text-muted-foreground py-2.5 text-right tabular-nums">
                    {player.mapsPlayed}
                  </td>
                  <td className="py-2.5 text-right tabular-nums">
                    {player.ultsPerMap.toFixed(1)}
                  </td>
                  <td className="text-muted-foreground py-2.5 text-right">
                    {player.topFightOpeningHero ? (
                      <span>
                        {player.topFightOpeningHero}{" "}
                        <span className="tabular-nums">
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
      </CardContent>
    </Card>
  );
}
