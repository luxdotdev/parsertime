"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PlayerMapPerformanceMatrix } from "@/data/team-analytics-dto";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useState } from "react";

type PlayerMapPerformanceCardProps = {
  data: PlayerMapPerformanceMatrix;
};

export function PlayerMapPerformanceCard({
  data,
}: PlayerMapPerformanceCardProps) {
  const t = useTranslations("teamStatsPage.playerMapPerformanceCard");

  const [hoveredCell, setHoveredCell] = useState<{
    player: string;
    map: string;
  } | null>(null);

  if (data.players.length === 0 || data.maps.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">{t("noData")}</p>
        </CardContent>
      </Card>
    );
  }

  function getPerformance(playerName: string, mapName: string) {
    return data.performance.find(
      (p) => p.playerName === playerName && p.mapName === mapName
    );
  }

  function getWinrateColor(winrate: number): string {
    if (winrate >= 70) return "bg-green-600 dark:bg-green-500 text-white";
    if (winrate >= 55) return "bg-green-500 dark:bg-green-600 text-white";
    if (winrate >= 45) return "bg-yellow-500 dark:bg-yellow-600 text-white";
    if (winrate >= 30) return "bg-orange-500 dark:bg-orange-600 text-white";
    return "bg-red-500 dark:bg-red-600 text-white";
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            <div
              className="grid gap-1"
              style={{
                gridTemplateColumns: `140px repeat(${data.maps.length}, 100px)`,
              }}
            >
              {/* Header row */}
              <div className="bg-background dark:bg-card sticky left-0" />
              {data.maps.map((mapName) => (
                <div
                  key={mapName}
                  className="flex items-center justify-center pb-2 text-center"
                >
                  <span className="text-xs font-medium">{mapName}</span>
                </div>
              ))}

              {/* Data rows */}
              {data.players.map((playerName) => {
                const playerPerformances = data.performance.filter(
                  (p) => p.playerName === playerName
                );
                const bestMap = playerPerformances.reduce(
                  (best, current) =>
                    current.winrate > best.winrate ? current : best,
                  playerPerformances[0]
                );
                const worstMap = playerPerformances.reduce(
                  (worst, current) =>
                    current.winrate < worst.winrate ? current : worst,
                  playerPerformances[0]
                );

                return (
                  <>
                    <div
                      key={`${playerName}-label`}
                      className="bg-background dark:bg-card dark:border-border sticky left-0 flex items-center gap-2 dark:border-b"
                    >
                      <span className="text-sm font-medium">{playerName}</span>
                    </div>
                    {data.maps.map((mapName) => {
                      const perf = getPerformance(playerName, mapName);
                      const isHovered =
                        hoveredCell?.player === playerName &&
                        hoveredCell?.map === mapName;
                      const isBest =
                        perf && bestMap && perf.mapName === bestMap.mapName;
                      const isWorst =
                        perf &&
                        worstMap &&
                        perf.mapName === worstMap.mapName &&
                        playerPerformances.length > 1;

                      return (
                        <div
                          key={`${playerName}-${mapName}`}
                          className={cn(
                            "relative flex h-16 w-full cursor-pointer flex-col items-center justify-center rounded transition-all",
                            perf
                              ? getWinrateColor(perf.winrate)
                              : "bg-muted text-muted-foreground",
                            isHovered && "ring-primary ring-2",
                            isBest && "ring-2 ring-green-400",
                            isWorst && "ring-2 ring-red-400"
                          )}
                          onMouseEnter={() =>
                            setHoveredCell({ player: playerName, map: mapName })
                          }
                          onMouseLeave={() => setHoveredCell(null)}
                          title={
                            perf
                              ? t("playerOnMap", {
                                  player: playerName,
                                  map: mapName,
                                  winrate: perf.winrate.toFixed(1),
                                  wins: perf.wins,
                                  losses: perf.losses,
                                })
                              : t("noDataTitle", {
                                  player: playerName,
                                  map: mapName,
                                })
                          }
                        >
                          {perf ? (
                            <>
                              <span className="text-lg font-bold">
                                {perf.winrate.toFixed(0)}%
                              </span>
                              <span className="text-xs opacity-90">
                                {t("winsLossesRecord", {
                                  wins: perf.wins,
                                  losses: perf.losses,
                                })}
                              </span>
                            </>
                          ) : (
                            <span className="text-xs">—</span>
                          )}
                        </div>
                      );
                    })}
                  </>
                );
              })}
            </div>
          </div>
        </div>

        {hoveredCell ? (
          <div className="bg-muted mt-4 rounded-lg p-3 text-sm">
            {(() => {
              const perf = getPerformance(hoveredCell.player, hoveredCell.map);
              if (!perf) {
                return (
                  <>
                    {t.rich("hasntPlayedMap", {
                      player: hoveredCell.player,
                      map: hoveredCell.map,
                      span: (chunks) => (
                        <span className="font-semibold">{chunks}</span>
                      ),
                    })}
                  </>
                );
              }
              return (
                <>
                  {t.rich("playerMapPerformance", {
                    player: hoveredCell.player,
                    map: hoveredCell.map,
                    winrate: perf.winrate.toFixed(1),
                    wins: perf.wins,
                    losses: perf.losses,
                    games: perf.gamesPlayed,
                    span: (chunks) => (
                      <span className="font-semibold">{chunks}</span>
                    ),
                  })}
                </>
              );
            })()}
          </div>
        ) : (
          <div className="bg-muted mt-4 rounded-lg p-3 text-sm">
            {t("hoverToSeePerformance")}
          </div>
        )}

        <div className="mt-4 flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-green-600 ring-2 ring-green-400" />
            <span className="text-muted-foreground">{t("bestMap")}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-red-500 ring-2 ring-red-400" />
            <span className="text-muted-foreground">{t("worstMap")}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
