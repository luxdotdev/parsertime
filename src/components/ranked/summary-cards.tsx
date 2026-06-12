import { StatRibbon } from "@/components/stats/team/stat-ribbon";
import type { SummaryStats } from "@/lib/ranked-stats";

type SummaryCardsProps = {
  stats: SummaryStats;
};

export function SummaryCards({ stats }: SummaryCardsProps) {
  const recordSub = `${stats.wins}W – ${stats.losses}L${
    stats.draws > 0 ? ` – ${stats.draws}D` : ""
  }`;

  const streakValue =
    stats.currentStreak > 0
      ? `${stats.currentStreak}${stats.streakType === "win" ? "W" : "L"}`
      : "—";

  const streakSub =
    stats.streakType === "win"
      ? `Won last ${stats.currentStreak}`
      : stats.streakType === "loss"
        ? `Lost last ${stats.currentStreak}`
        : "No active streak";

  return (
    <StatRibbon
      columns={4}
      cells={[
        {
          label: "Matches",
          value: String(stats.totalMatches),
          sub: `across ${stats.uniqueMaps} maps`,
        },
        {
          label: "Winrate",
          value: `${stats.winrate}%`,
          sub: recordSub,
          emphasis: true,
        },
        {
          label: "Best map",
          value: stats.bestMap,
          sub: `${stats.bestMapWinrate}% winrate`,
          valueClassName: "truncate text-lg",
        },
        {
          label: "Current streak",
          value: streakValue,
          sub: streakSub,
        },
      ]}
    />
  );
}
