import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SummaryStats } from "@/lib/ranked-stats";
import { cn } from "@/lib/utils";
import { Flame, Map, Percent, Swords } from "lucide-react";

type SummaryCardsProps = {
  stats: SummaryStats;
};

export function SummaryCards({ stats }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-muted-foreground flex items-center gap-2 text-sm font-normal">
            <Swords className="size-4" aria-hidden="true" />
            Total Matches
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold tabular-nums">
            {stats.totalMatches}
          </p>
          <p className="text-muted-foreground text-xs">
            across {stats.uniqueMaps} maps
          </p>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-muted-foreground flex items-center gap-2 text-sm font-normal">
            <Percent className="size-4" aria-hidden="true" />
            Winrate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p
            className={cn(
              "text-2xl font-bold tabular-nums",
              stats.winrate >= 50 ? "text-chart-win" : "text-chart-loss"
            )}
          >
            {stats.winrate}%
          </p>
          <p className="text-muted-foreground text-xs">
            {stats.wins}W &ndash; {stats.losses}L
            {stats.draws > 0 ? ` \u2013 ${stats.draws}D` : ""}
          </p>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-muted-foreground flex items-center gap-2 text-sm font-normal">
            <Map className="size-4" aria-hidden="true" />
            Best Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="truncate text-2xl font-bold">{stats.bestMap}</p>
          <p className="text-muted-foreground text-xs">
            {stats.bestMapWinrate}% winrate
          </p>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-muted-foreground flex items-center gap-2 text-sm font-normal">
            <Flame className="size-4" aria-hidden="true" />
            Streak
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p
            className={cn(
              "text-2xl font-bold tabular-nums",
              stats.streakType === "win"
                ? "text-chart-win"
                : stats.streakType === "loss"
                  ? "text-chart-loss"
                  : ""
            )}
          >
            {stats.currentStreak > 0
              ? `${stats.currentStreak}${stats.streakType === "win" ? "W" : "L"}`
              : "\u2014"}
          </p>
          <p className="text-muted-foreground text-xs">
            {stats.streakType === "win"
              ? `Won last ${stats.currentStreak}`
              : stats.streakType === "loss"
                ? `Lost last ${stats.currentStreak}`
                : "No active streak"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
