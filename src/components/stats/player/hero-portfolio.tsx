"use client";

import { cn, toHero, useHeroNames } from "@/lib/utils";
import { type HeroName, heroRoleMapping } from "@/types/heroes";
import type { Kill, PlayerStat } from "@/generated/prisma/browser";
import { useTranslations } from "next-intl";
import Image from "next/image";

type Aggregate = {
  hero: HeroName;
  games: number;
  finalBlows: number;
  deaths: number;
  timePlayed: number;
};

export function HeroPortfolio({
  stats,
  deaths,
  selectedHeroes,
  onToggleHero,
  emptyMessage,
  limit = 6,
}: {
  stats: PlayerStat[];
  deaths: Kill[];
  selectedHeroes: HeroName[];
  onToggleHero: (hero: HeroName) => void;
  emptyMessage: string;
  limit?: number;
}) {
  const heroNames = useHeroNames();
  const t = useTranslations("statsPage.playerStats.heroPortfolio");

  const aggregated = aggregate(stats, deaths).slice(0, limit);

  if (aggregated.length === 0) {
    return (
      <div className="bg-card text-muted-foreground flex h-32 items-center justify-center px-5 text-sm">
        {emptyMessage}
      </div>
    );
  }

  const selected = new Set(selectedHeroes);

  return (
    <div className="bg-border grid grid-cols-2 gap-px sm:grid-cols-3 lg:grid-cols-6">
      {aggregated.map((entry) => {
        const isActive = selected.has(entry.hero);
        const heroLabel = heroNames.get(toHero(entry.hero)) ?? entry.hero;
        const role = heroRoleMapping[entry.hero];

        return (
          <button
            key={entry.hero}
            type="button"
            onClick={() => onToggleHero(entry.hero)}
            aria-pressed={isActive}
            className={cn(
              "bg-card group relative flex flex-col gap-3 px-4 py-4 text-left transition-colors",
              "[@media(hover:hover)_and_(pointer:fine)]:hover:bg-muted/40",
              isActive && "bg-primary/5"
            )}
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <Image
                  src={`/heroes/${toHero(entry.hero)}.png`}
                  alt=""
                  width={256}
                  height={256}
                  className={cn(
                    "size-12 rounded-md object-cover ring-1 transition-shadow",
                    isActive ? "ring-primary" : "ring-foreground/10"
                  )}
                />
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-semibold">
                  {heroLabel}
                </span>
                <span className="text-muted-foreground font-mono text-[0.625rem] tracking-[0.06em] uppercase">
                  {t(`role.${role.toLowerCase()}`)}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Metric label={t("games")} value={entry.games.toString()} />
              <Metric
                label={t("finalBlows")}
                value={entry.finalBlows.toString()}
              />
              <Metric label={t("deaths")} value={entry.deaths.toString()} />
            </div>
          </button>
        );
      })}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-muted-foreground/80 font-mono text-[0.625rem] tracking-[0.06em] uppercase">
        {label}
      </span>
      <span className="font-mono text-sm font-semibold tabular-nums">
        {value}
      </span>
    </div>
  );
}

function aggregate(stats: PlayerStat[], deaths: Kill[]): Aggregate[] {
  const byHero = new Map<HeroName, Aggregate>();

  for (const stat of stats) {
    if (stat.hero_time_played < 60) continue;
    const hero = stat.player_hero as HeroName;
    let entry = byHero.get(hero);
    if (!entry) {
      entry = {
        hero,
        games: 0,
        finalBlows: 0,
        deaths: 0,
        timePlayed: 0,
      };
      byHero.set(hero, entry);
    }
    entry.games += 1;
    entry.finalBlows += stat.final_blows;
    entry.timePlayed += stat.hero_time_played;
  }

  for (const death of deaths) {
    const hero = death.victim_hero as HeroName;
    const entry = byHero.get(hero);
    if (entry) entry.deaths += 1;
  }

  return Array.from(byHero.values()).sort((a, b) => {
    if (b.games !== a.games) return b.games - a.games;
    return b.timePlayed - a.timePlayed;
  });
}
