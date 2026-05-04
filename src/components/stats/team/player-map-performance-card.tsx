"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import type { PlayerMapPerformanceMatrix } from "@/data/team/types";
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
      <section className="space-y-4">
        <SectionHeader
          eyebrow="Maps · Player matrix"
          title={t("title")}
          description={t("noData")}
        />
      </section>
    );
  }

  function getPerformance(playerName: string, mapName: string) {
    return data.performance.find(
      (p) => p.playerName === playerName && p.mapName === mapName
    );
  }

  function getWinrateClass(winrate: number): string {
    if (winrate >= 70) return "bg-primary text-primary-foreground";
    if (winrate >= 55) return "bg-primary/60 text-foreground";
    if (winrate >= 45) return "bg-primary/35 text-foreground";
    if (winrate >= 30) return "bg-primary/20 text-foreground";
    return "bg-muted text-muted-foreground";
  }

  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow="Maps · Player matrix"
        title={t("title")}
        description={t("description")}
      />
      <div className="relative overflow-x-auto">
        <div className="inline-block min-w-full">
          <div
            className="grid gap-1"
            style={{
              gridTemplateColumns: `140px repeat(${data.maps.length}, 100px)`,
            }}
          >
            <div className="bg-background sticky left-0" />
            {data.maps.map((mapName) => (
              <div
                key={mapName}
                className="text-muted-foreground flex items-center justify-center pb-2 text-center font-mono text-[11px] tracking-[0.16em] uppercase"
              >
                <span>{mapName}</span>
              </div>
            ))}

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
                    className="bg-background text-foreground sticky left-0 flex items-center gap-2"
                  >
                    <span className="text-sm font-medium">{playerName}</span>
                  </div>
                  {data.maps.map((mapName) => {
                    const perf = getPerformance(playerName, mapName);
                    const isHovered =
                      hoveredCell?.player === playerName &&
                      hoveredCell?.map === mapName;
                    const isBest = perf?.mapName === bestMap?.mapName;
                    const isWorst =
                      perf?.mapName === worstMap?.mapName &&
                      playerPerformances.length > 1;

                    return (
                      <div
                        key={`${playerName}-${mapName}`}
                        className={cn(
                          "relative flex h-16 w-full cursor-pointer flex-col items-center justify-center rounded transition-all",
                          perf
                            ? getWinrateClass(perf.winrate)
                            : "bg-muted text-muted-foreground",
                          isHovered && "ring-foreground/40 ring-2",
                          isBest && "ring-primary ring-2",
                          isWorst && "ring-destructive/60 ring-2"
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
                            <span className="font-mono text-lg font-bold tabular-nums">
                              {perf.winrate.toFixed(0)}%
                            </span>
                            <span className="font-mono text-xs tabular-nums opacity-90">
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
        <div className="bg-muted/50 rounded-lg p-3 text-sm">
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
        <div className="bg-muted/50 rounded-lg p-3 text-sm">
          {t("hoverToSeePerformance")}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="bg-muted h-3 w-6 rounded-sm" />
          <span className="text-muted-foreground font-mono tracking-wider uppercase">
            0%
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="bg-primary/20 h-3 w-6 rounded-sm" />
          <span className="text-muted-foreground font-mono tracking-wider uppercase">
            30%
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="bg-primary/35 h-3 w-6 rounded-sm" />
          <span className="text-muted-foreground font-mono tracking-wider uppercase">
            45%
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="bg-primary/60 h-3 w-6 rounded-sm" />
          <span className="text-muted-foreground font-mono tracking-wider uppercase">
            55%
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="bg-primary h-3 w-6 rounded-sm" />
          <span className="text-muted-foreground font-mono tracking-wider uppercase">
            70%+
          </span>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-2">
            <div className="ring-primary h-4 w-4 rounded ring-2" />
            <span className="text-muted-foreground">{t("bestMap")}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="ring-destructive/60 h-4 w-4 rounded ring-2" />
            <span className="text-muted-foreground">{t("worstMap")}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
