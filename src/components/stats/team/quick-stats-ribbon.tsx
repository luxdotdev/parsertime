"use client";

import {
  type RibbonCell,
  StatRibbon,
} from "@/components/stats/team/stat-ribbon";
import type { QuickWinsStats } from "@/data/team/types";
import { useTranslations } from "next-intl";

type QuickStatsRibbonProps = {
  stats: QuickWinsStats;
  uniqueHeroes: number;
  uniqueMaps: number;
};

function formatFightDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  return `${seconds.toFixed(1)}s`;
}

export function QuickStatsRibbon({
  stats,
  uniqueHeroes,
  uniqueMaps,
}: QuickStatsRibbonProps) {
  const t = useTranslations("teamStatsPage.quickStatsCard");

  const last10 = stats.last10GamesPerformance;
  const last10HasGames = last10.wins + last10.losses > 0;
  const dur = stats.averageFightDuration;

  const cells: RibbonCell[] = [
    {
      label: t("last10Games"),
      value: last10HasGames ? `${last10.winrate.toFixed(0)}%` : "—",
      sub: last10HasGames ? `${last10.wins}–${last10.losses}` : t("noData"),
      emphasis: true,
    },
    {
      label: t("avgFightDuration"),
      value: formatFightDuration(dur),
      sub:
        dur === null
          ? "—"
          : dur < 20
            ? t("quickFights")
            : dur < 30
              ? t("standard")
              : t("longFights"),
    },
    {
      label: "Hero Pool",
      value: uniqueHeroes > 0 ? String(uniqueHeroes) : "—",
      sub: uniqueHeroes > 0 ? "unique heroes" : "—",
    },
    {
      label: "Map Pool",
      value: uniqueMaps > 0 ? String(uniqueMaps) : "—",
      sub: uniqueMaps > 0 ? "unique maps" : "—",
    },
  ];

  return <StatRibbon cells={cells} columns={4} />;
}
