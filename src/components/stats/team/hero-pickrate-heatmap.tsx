"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HeroPickrateMatrix } from "@/data/team-analytics-dto";
import { cn, toHero, toTimestampWithHours, useHeroNames } from "@/lib/utils";
import { heroPriority, heroRoleMapping } from "@/types/heroes";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useState } from "react";

type HeroPickrateHeatmapProps = {
  data: HeroPickrateMatrix;
};

export function HeroPickrateHeatmap({ data }: HeroPickrateHeatmapProps) {
  const t = useTranslations("teamStatsPage.heroPickrateHeatmap");
  const heroNames = useHeroNames();

  const [hoveredCell, setHoveredCell] = useState<{
    player: string;
    hero: string;
  } | null>(null);

  if (data.players.length === 0) {
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

  // Get top 15 most played heroes across all players
  const heroPlaytimeMap = new Map<string, number>();
  for (const player of data.players) {
    for (const hero of player.heroes) {
      const current = heroPlaytimeMap.get(hero.heroName) ?? 0;
      heroPlaytimeMap.set(hero.heroName, current + hero.playtime);
    }
  }

  const topHeroes = Array.from(heroPlaytimeMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .sort((a, b) => {
      const roleA = heroRoleMapping[a[0] as keyof typeof heroRoleMapping];
      const roleB = heroRoleMapping[b[0] as keyof typeof heroRoleMapping];
      const priorityA = heroPriority[roleA];
      const priorityB = heroPriority[roleB];

      return priorityA - priorityB;
    })
    .map((e) => e[0]);

  // Calculate max playtime for color scaling
  let maxPlaytime = 0;
  for (const player of data.players) {
    for (const hero of player.heroes) {
      if (topHeroes.includes(hero.heroName)) {
        maxPlaytime = Math.max(maxPlaytime, hero.playtime);
      }
    }
  }

  function getHeatmapColor(playtime: number): string {
    if (playtime === 0) return "bg-muted";
    const intensity = Math.min((playtime / maxPlaytime) * 100, 100);

    if (intensity >= 75) return "bg-green-600 dark:bg-green-500";
    if (intensity >= 50) return "bg-green-500 dark:bg-green-600";
    if (intensity >= 25) return "bg-green-400 dark:bg-green-700";
    return "bg-green-300 dark:bg-green-800";
  }

  function getPlaytime(playerName: string, heroName: string): number {
    const player = data.players.find((p) => p.playerName === playerName);
    if (!player) return 0;
    const hero = player.heroes.find((h) => h.heroName === heroName);
    return hero?.playtime ?? 0;
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
                gridTemplateColumns: `120px repeat(${topHeroes.length}, 60px)`,
              }}
            >
              {/* Header row */}
              <div className="bg-background dark:bg-card sticky left-0" />
              {topHeroes.map((heroName) => (
                <div
                  key={heroName}
                  className="flex flex-col items-center justify-end gap-1 pb-2"
                >
                  <span
                    className="text-xs font-medium"
                    style={{
                      writingMode: "vertical-rl",
                      transform: "rotate(180deg)",
                    }}
                  >
                    {heroNames.get(toHero(heroName)) ?? heroName}
                  </span>
                  <div className="relative h-10 w-10">
                    <Image
                      src={`/heroes/${toHero(heroName)}.png`}
                      alt={heroNames.get(toHero(heroName)) ?? heroName}
                      fill
                      className="rounded object-cover"
                    />
                  </div>
                </div>
              ))}

              {/* Data rows */}
              {data.players.map((player) => (
                <>
                  <div
                    key={`${player.playerName}-label`}
                    className="bg-background dark:bg-card dark:border-border sticky left-0 flex items-center text-sm font-medium dark:border-b"
                  >
                    {player.playerName}
                  </div>
                  {topHeroes.map((heroName) => {
                    const playtime = getPlaytime(player.playerName, heroName);
                    const isHovered =
                      hoveredCell?.player === player.playerName &&
                      hoveredCell?.hero === heroName;

                    return (
                      <div
                        key={`${player.playerName}-${heroName}`}
                        className={cn(
                          "relative flex h-12 w-full cursor-pointer items-center justify-center rounded transition-all",
                          getHeatmapColor(playtime),
                          isHovered && "ring-primary ring-2"
                        )}
                        onMouseEnter={() =>
                          setHoveredCell({
                            player: player.playerName,
                            hero: heroName,
                          })
                        }
                        onMouseLeave={() => setHoveredCell(null)}
                        title={`${player.playerName} - ${heroName}: ${toTimestampWithHours(playtime)}`}
                      >
                        {playtime > 0 && (
                          <span className="text-xs font-bold text-white drop-shadow-md">
                            {Math.round(
                              (playtime / player.totalPlaytime) * 100
                            )}
                            %
                          </span>
                        )}
                      </div>
                    );
                  })}
                </>
              ))}
            </div>
          </div>
        </div>

        {hoveredCell ? (
          <div className="bg-muted mt-4 rounded-lg p-3 text-sm">
            {t.rich("hoverText", {
              player: (chunks) => (
                <span className="font-semibold">{chunks}</span>
              ),
              playerName: hoveredCell.player,
              hero: (chunks) => <span className="font-semibold">{chunks}</span>,
              heroName:
                heroNames.get(toHero(hoveredCell.hero)) ?? hoveredCell.hero,
              playtime: toTimestampWithHours(
                getPlaytime(hoveredCell.player, hoveredCell.hero)
              ),
            })}
          </div>
        ) : (
          <div className="bg-muted mt-4 rounded-lg p-3 text-sm">
            {t("hoverTextDescription")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
