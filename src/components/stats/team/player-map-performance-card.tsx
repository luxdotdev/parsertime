"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PlayerMapPerformanceMatrix } from "@/data/team-analytics-dto";
import { cn } from "@/lib/utils";
import { useState } from "react";

type PlayerMapPerformanceCardProps = {
  data: PlayerMapPerformanceMatrix;
};

export function PlayerMapPerformanceCard({
  data,
}: PlayerMapPerformanceCardProps) {
  const [hoveredCell, setHoveredCell] = useState<{
    player: string;
    map: string;
  } | null>(null);

  if (data.players.length === 0 || data.maps.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Player Map Performance Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No map performance data available yet.
          </p>
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
        <CardTitle>Player Map Performance Matrix</CardTitle>
        <p className="text-muted-foreground text-sm">
          Each player&apos;s best and worst maps by winrate
        </p>
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
                              ? `${playerName} on ${mapName}: ${perf.winrate.toFixed(1)}% (${perf.wins}W-${perf.losses}L)`
                              : `${playerName} - ${mapName}: No data`
                          }
                        >
                          {perf ? (
                            <>
                              <span className="text-lg font-bold">
                                {perf.winrate.toFixed(0)}%
                              </span>
                              <span className="text-xs opacity-90">
                                {perf.wins}W-{perf.losses}L
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
                    <span className="font-semibold">{hoveredCell.player}</span>{" "}
                    hasn&apos;t played{" "}
                    <span className="font-semibold">{hoveredCell.map}</span>{" "}
                    yet.
                  </>
                );
              }
              return (
                <>
                  <span className="font-semibold">{hoveredCell.player}</span> on{" "}
                  <span className="font-semibold">{hoveredCell.map}</span>:{" "}
                  {perf.winrate.toFixed(1)}% winrate ({perf.wins}W-{perf.losses}
                  L) in {perf.gamesPlayed} games
                </>
              );
            })()}
          </div>
        ) : (
          <div className="bg-muted mt-4 rounded-lg p-3 text-sm">
            Hover over a cell to see the player&apos;s performance on that map.
          </div>
        )}

        <div className="mt-4 flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-green-600 ring-2 ring-green-400" />
            <span className="text-muted-foreground">Best map</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-red-500 ring-2 ring-red-400" />
            <span className="text-muted-foreground">Worst map</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
