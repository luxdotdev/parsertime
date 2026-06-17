import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getMostPlayedHeroes,
  getRecentFormData,
  getSummaryStats,
  getHeroWinrates,
} from "@/lib/ranked-stats";
import type { MatchData } from "@/lib/ranked-stats";
import type { RankedMatchWithHeroes } from "@/data/ranked";

type Props = {
  matches: RankedMatchWithHeroes[];
};

export function RankedSummary({ matches }: Props) {
  const matchData: MatchData[] = matches.map((m) => ({
    id: m.id,
    map: m.map,
    mapType: m.mapType,
    result: m.result,
    groupSize: m.groupSize,
    playedAt: m.playedAt,
    createdAt: m.createdAt,
    heroes: m.heroes.map((h) => ({
      id: h.id,
      hero: h.hero,
      role: h.role,
      percentage: h.percentage,
    })),
  }));

  const summary = getSummaryStats(matchData);
  const heroesResult = getMostPlayedHeroes(matchData);
  const top5Heroes = heroesResult.data.slice(0, 5);
  const heroWinrates = getHeroWinrates(matchData);
  const formResult = getRecentFormData(matchData);

  const streakLabel =
    summary.streakType === "none"
      ? null
      : `${summary.currentStreak}${summary.streakType === "win" ? "W" : "L"} streak`;

  const trendLabel =
    formResult.trend === "improving"
      ? `Improving (+${formResult.delta}%)`
      : formResult.trend === "declining"
        ? `Declining (${formResult.delta}%)`
        : "Stable";

  const trendVariant: "default" | "secondary" | "destructive" =
    formResult.trend === "improving"
      ? "default"
      : formResult.trend === "declining"
        ? "destructive"
        : "secondary";

  return (
    <div className="space-y-6">
      {/* Overview row */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-muted-foreground font-mono text-sm tracking-widest uppercase">
            Ranked Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-2xl font-bold tabular-nums">
                {summary.winrate}%
              </span>
              <span className="text-muted-foreground text-xs">Win rate</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-2xl font-bold tabular-nums">
                {summary.wins}W–{summary.losses}L
                {summary.draws > 0 ? `–${summary.draws}D` : ""}
              </span>
              <span className="text-muted-foreground text-xs">
                {summary.totalMatches} matches
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              {streakLabel ? (
                <span className="text-2xl font-bold tabular-nums">
                  {streakLabel}
                </span>
              ) : (
                <span className="text-muted-foreground text-2xl font-bold">
                  —
                </span>
              )}
              <span className="text-muted-foreground text-xs">
                Current streak
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              {summary.bestMap ? (
                <>
                  <span className="truncate text-lg font-semibold">
                    {summary.bestMap}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    Best map · {summary.bestMapWinrate}% WR
                  </span>
                </>
              ) : (
                <>
                  <span className="text-muted-foreground text-2xl font-bold">
                    —
                  </span>
                  <span className="text-muted-foreground text-xs">
                    Best map
                  </span>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Top Heroes */}
        {top5Heroes.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground font-mono text-sm tracking-widest uppercase">
                Top Heroes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {top5Heroes.map((entry) => {
                  const wrEntry = heroWinrates.data.find(
                    (h) => h.hero === entry.hero
                  );
                  return (
                    <li
                      key={entry.hero}
                      className="flex items-center justify-between gap-2"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <Badge
                          variant="outline"
                          className="shrink-0 font-mono text-[10px]"
                        >
                          {entry.role}
                        </Badge>
                        <span className="truncate text-sm font-medium">
                          {entry.hero}
                        </span>
                      </div>
                      <div className="text-muted-foreground flex shrink-0 items-center gap-3 text-right font-mono text-xs tabular-nums">
                        <span>{entry.count}g</span>
                        {wrEntry ? (
                          <span className="w-12 text-right">
                            {wrEntry.winrate}% WR
                          </span>
                        ) : (
                          <span className="w-12 text-right">—</span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Recent Form */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground font-mono text-sm tracking-widest uppercase">
              Recent Form
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant={trendVariant}>{trendLabel}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-xl font-bold tabular-nums">
                  {formResult.recent.winrate}%
                </span>
                <span className="text-muted-foreground text-xs">
                  Recent WR (last {formResult.recent.total}g)
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xl font-bold tabular-nums">
                  {formResult.overall.winrate}%
                </span>
                <span className="text-muted-foreground text-xs">
                  Overall WR ({formResult.overall.total}g)
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
