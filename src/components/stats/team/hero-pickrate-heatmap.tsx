"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import type { HeroPickrateMatrix } from "@/data/team/types";
import { cn, toHero, toTimestampWithHours, useHeroNames } from "@/lib/utils";
import { heroPriority, heroRoleMapping } from "@/types/heroes";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Fragment, useState } from "react";

type HeroPickrateHeatmapProps = {
  data: HeroPickrateMatrix;
};

const RAMP_STOPS = [0, 25, 50, 75, 100];

function formatPlaytimeShort(seconds: number): string {
  if (seconds <= 0) return "—";
  const hours = seconds / 3600;
  if (hours >= 10) return `${Math.round(hours)}h`;
  if (hours >= 1) return `${hours.toFixed(1)}h`;
  const minutes = Math.round(seconds / 60);
  return `${minutes}m`;
}

export function HeroPickrateHeatmap({ data }: HeroPickrateHeatmapProps) {
  const t = useTranslations("teamStatsPage.heroPickrateHeatmap");
  const heroNames = useHeroNames();

  const [hoveredCell, setHoveredCell] = useState<{
    player: string;
    hero: string;
  } | null>(null);

  if (data.players.length === 0) {
    return (
      <section className="space-y-4">
        <SectionHeader eyebrow="Heroes · Pickrate" title={t("title")} />
        <p className="text-muted-foreground text-sm">{t("noData")}</p>
      </section>
    );
  }

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

  let maxPlaytime = 0;
  for (const player of data.players) {
    for (const hero of player.heroes) {
      if (topHeroes.includes(hero.heroName)) {
        maxPlaytime = Math.max(maxPlaytime, hero.playtime);
      }
    }
  }

  function getHeatmapStyle(playtime: number): {
    backgroundColor: string;
    color: string;
  } {
    if (playtime === 0 || maxPlaytime === 0) {
      return {
        backgroundColor: "var(--muted)",
        color: "var(--muted-foreground)",
      };
    }
    const intensity = Math.min(playtime / maxPlaytime, 1);
    const opacity = 0.15 + intensity * 0.8;
    return {
      backgroundColor: `color-mix(in oklab, var(--primary) ${(opacity * 100).toFixed(0)}%, transparent)`,
      color:
        intensity > 0.55 ? "var(--primary-foreground)" : "var(--foreground)",
    };
  }

  function getPlaytime(playerName: string, heroName: string): number {
    const player = data.players.find((p) => p.playerName === playerName);
    if (!player) return 0;
    const hero = player.heroes.find((h) => h.heroName === heroName);
    return hero?.playtime ?? 0;
  }

  const heroTotals = topHeroes.map((heroName) => {
    let total = 0;
    for (const player of data.players) {
      const hero = player.heroes.find((h) => h.heroName === heroName);
      total += hero?.playtime ?? 0;
    }
    return { heroName, total };
  });

  const heroTotalSum = heroTotals.reduce((acc, h) => acc + h.total, 0);

  const legend = (
    <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.16em] uppercase">
      <span className="text-muted-foreground">0%</span>
      <div className="flex items-center gap-px">
        {RAMP_STOPS.map((stop) => (
          <span
            key={stop}
            className="h-3 w-5"
            style={{
              backgroundColor:
                stop === 0
                  ? "var(--muted)"
                  : `color-mix(in oklab, var(--primary) ${(0.15 + (stop / 100) * 0.8) * 100}%, transparent)`,
            }}
            aria-hidden="true"
          />
        ))}
      </div>
      <span className="text-muted-foreground">100%</span>
    </div>
  );

  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow="Heroes · Pickrate"
        title={t("title")}
        description={t("description")}
        rightSlot={legend}
      />
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <div
            className="grid"
            style={{
              gridTemplateColumns: `120px repeat(${topHeroes.length}, 44px) 64px`,
            }}
          >
            <div className="bg-background dark:bg-card sticky left-0" />
            {topHeroes.map((heroName) => (
              <div
                key={heroName}
                className="flex flex-col items-center justify-end gap-1 pb-2"
              >
                <span
                  className="text-muted-foreground font-mono text-[10px] tracking-[0.14em] uppercase"
                  style={{
                    writingMode: "vertical-rl",
                    transform: "rotate(180deg)",
                  }}
                >
                  {heroNames.get(toHero(heroName)) ?? heroName}
                </span>
                <div className="relative h-9 w-9">
                  <Image
                    src={`/heroes/${toHero(heroName)}.png`}
                    alt={heroNames.get(toHero(heroName)) ?? heroName}
                    fill
                    className="rounded object-cover"
                  />
                </div>
              </div>
            ))}
            <div className="text-muted-foreground flex items-end justify-end pr-1 pb-2 font-mono text-[10px] tracking-[0.16em] uppercase">
              Total
            </div>

            {data.players.map((player) => (
              <Fragment key={player.playerName}>
                <div className="bg-background dark:bg-card text-foreground sticky left-0 flex h-9 items-center pr-2 font-mono text-[11px] tracking-[0.16em] uppercase">
                  {player.playerName}
                </div>
                {topHeroes.map((heroName) => {
                  const playtime = getPlaytime(player.playerName, heroName);
                  const isHovered =
                    hoveredCell?.player === player.playerName &&
                    hoveredCell?.hero === heroName;
                  const heatmapStyle = getHeatmapStyle(playtime);

                  return (
                    <div
                      key={`${player.playerName}-${heroName}`}
                      className={cn(
                        "relative flex h-9 w-full cursor-pointer items-center justify-center rounded-[2px] transition-all",
                        isHovered && "ring-primary ring-2"
                      )}
                      style={{ backgroundColor: heatmapStyle.backgroundColor }}
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
                        <span
                          className="font-mono text-[10px] font-semibold tabular-nums"
                          style={{ color: heatmapStyle.color }}
                        >
                          {Math.round((playtime / player.totalPlaytime) * 100)}%
                        </span>
                      )}
                    </div>
                  );
                })}
                <div
                  className="text-foreground flex h-9 items-center justify-end pr-1 pl-2 font-mono text-[11px] font-semibold tabular-nums"
                  title={toTimestampWithHours(player.totalPlaytime)}
                >
                  {formatPlaytimeShort(player.totalPlaytime)}
                </div>
              </Fragment>
            ))}

            <div className="text-muted-foreground flex h-9 items-center pt-1 pr-2 font-mono text-[10px] tracking-[0.16em] uppercase">
              Total
            </div>
            {topHeroes.map((heroName) => {
              const total =
                heroTotals.find((h) => h.heroName === heroName)?.total ?? 0;
              const share =
                heroTotalSum > 0 ? Math.round((total / heroTotalSum) * 100) : 0;
              const heatmapStyle = getHeatmapStyle(total);

              return (
                <div
                  key={`total-${heroName}`}
                  className="relative flex h-9 w-full items-center justify-center rounded-[2px]"
                  style={{ backgroundColor: heatmapStyle.backgroundColor }}
                  title={`${heroName}: ${toTimestampWithHours(total)}`}
                >
                  {total > 0 && (
                    <span
                      className="font-mono text-[10px] font-semibold tabular-nums"
                      style={{ color: heatmapStyle.color }}
                    >
                      {share}%
                    </span>
                  )}
                </div>
              );
            })}
            <div
              className="text-foreground flex h-9 items-center justify-end pt-1 pr-1 pl-2 font-mono text-[11px] font-semibold tabular-nums"
              title={toTimestampWithHours(heroTotalSum)}
            >
              {formatPlaytimeShort(heroTotalSum)}
            </div>
          </div>
        </div>
      </div>

      <p className="text-muted-foreground font-mono text-[10px] tracking-[0.14em] uppercase">
        Single-hue saturation ramp; colorblind safe.
      </p>

      {hoveredCell ? (
        <p className="text-muted-foreground text-sm">
          {t.rich("hoverText", {
            player: (chunks) => (
              <span className="text-foreground font-medium">{chunks}</span>
            ),
            playerName: hoveredCell.player,
            hero: (chunks) => (
              <span className="text-foreground font-medium">{chunks}</span>
            ),
            heroName:
              heroNames.get(toHero(hoveredCell.hero)) ?? hoveredCell.hero,
            playtime: toTimestampWithHours(
              getPlaytime(hoveredCell.player, hoveredCell.hero)
            ),
          })}
        </p>
      ) : (
        <p className="text-muted-foreground text-sm">
          {t("hoverTextDescription")}
        </p>
      )}
    </section>
  );
}
