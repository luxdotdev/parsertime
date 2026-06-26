"use client";

import {
  type RibbonCell,
  StatRibbon,
} from "@/components/stats/team/stat-ribbon";
import { useTempoReadLabel } from "@/components/stats/team/use-tempo-read-label";
import type { QuickWinsStats } from "@/data/team/types";
import type { TempoBaselineStat } from "@/lib/tempo/classify";
import { useTranslations } from "next-intl";

type QuickStatsRibbonProps = {
  stats: QuickWinsStats;
  uniqueHeroes: number;
  uniqueMaps: number;
  fightBaseline?: TempoBaselineStat | null;
};

export function QuickStatsRibbon({
  stats,
  uniqueHeroes,
  uniqueMaps,
  fightBaseline,
}: QuickStatsRibbonProps) {
  const t = useTranslations("teamStatsPage.quickStatsCard");
  const tempoLabel = useTempoReadLabel();

  function formatFightDuration(seconds: number | null): string {
    if (seconds === null) return "—";
    return t("durationSeconds", { seconds: seconds.toFixed(1) });
  }

  const last10 = stats.last10GamesPerformance;
  const last10HasGames = last10.wins + last10.losses > 0;
  const dur = stats.averageFightDuration;
  const fightSub = tempoLabel(stats.averageFightDuration, fightBaseline) ?? "—";

  const cells: RibbonCell[] = [
    {
      label: t("last10Games"),
      value: last10HasGames ? `${last10.winrate.toFixed(0)}%` : "—",
      sub: last10HasGames
        ? t("recordShort", { wins: last10.wins, losses: last10.losses })
        : t("noData"),
      emphasis: true,
    },
    {
      label: t("avgFightDuration"),
      value: formatFightDuration(dur),
      sub: fightSub,
    },
    {
      label: t("heroPool"),
      value: uniqueHeroes > 0 ? String(uniqueHeroes) : "—",
      sub: uniqueHeroes > 0 ? t("uniqueHeroes", { count: uniqueHeroes }) : "—",
    },
    {
      label: t("mapPool"),
      value: uniqueMaps > 0 ? String(uniqueMaps) : "—",
      sub: uniqueMaps > 0 ? t("uniqueMaps", { count: uniqueMaps }) : "—",
    },
  ];

  return <StatRibbon cells={cells} columns={4} />;
}
