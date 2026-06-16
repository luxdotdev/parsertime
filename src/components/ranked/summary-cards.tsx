import { StatRibbon } from "@/components/stats/team/stat-ribbon";
import type { SummaryStats } from "@/lib/ranked-stats";
import { useTranslations } from "next-intl";

type SummaryCardsProps = {
  stats: SummaryStats;
};

export function SummaryCards({ stats }: SummaryCardsProps) {
  const t = useTranslations("ranked.summary");

  const recordSub =
    stats.draws > 0
      ? t("recordWithDraws", {
          wins: stats.wins,
          losses: stats.losses,
          draws: stats.draws,
        })
      : t("record", { wins: stats.wins, losses: stats.losses });

  const streakValue =
    stats.currentStreak > 0
      ? `${stats.currentStreak}${stats.streakType === "win" ? "W" : "L"}`
      : "—";

  const streakSub =
    stats.streakType === "win"
      ? t("wonLast", { count: stats.currentStreak })
      : stats.streakType === "loss"
        ? t("lostLast", { count: stats.currentStreak })
        : t("noStreak");

  return (
    <StatRibbon
      columns={4}
      cells={[
        {
          label: t("matches"),
          value: String(stats.totalMatches),
          sub: t("acrossMaps", { count: stats.uniqueMaps }),
        },
        {
          label: t("winrate"),
          value: `${stats.winrate}%`,
          sub: recordSub,
          emphasis: true,
        },
        {
          label: t("bestMap"),
          value: stats.bestMap,
          sub: t("mapWinrate", { winrate: stats.bestMapWinrate }),
          valueClassName: "truncate text-lg",
        },
        {
          label: t("currentStreak"),
          value: streakValue,
          sub: streakSub,
        },
      ]}
    />
  );
}
