"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HeroPoolAnalysis } from "@/data/team-hero-pool-dto";
import { cn, toHero, useHeroNames } from "@/lib/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";

type HeroWinratesCardProps = {
  heroPool: HeroPoolAnalysis;
};

export function HeroWinratesCard({ heroPool }: HeroWinratesCardProps) {
  const t = useTranslations("teamStatsPage.heroWinratesCard");
  const heroNames = useHeroNames();
  const topHeroes = heroPool.topHeroWinrates;

  if (topHeroes.length === 0) {
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

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">{t("title")}</h3>

      {topHeroes.map((hero, idx) => (
        <div
          key={hero.heroName}
          className={cn(
            "flex items-center gap-3 rounded-lg border p-3",
            idx === 0 && "border-green-500 bg-green-50 dark:bg-green-950/30"
          )}
        >
          <span className="text-muted-foreground text-lg font-bold">
            #{idx + 1}
          </span>
          <div className="relative h-12 w-12 overflow-hidden rounded">
            <Image
              src={`/heroes/${toHero(hero.heroName)}.png`}
              alt={heroNames.get(toHero(hero.heroName)) ?? hero.heroName}
              fill
              className="object-cover"
            />
          </div>
          <div className="flex-1">
            <div className="font-semibold">
              {heroNames.get(toHero(hero.heroName)) ?? hero.heroName}
            </div>
            <div className="text-muted-foreground text-xs">
              {t("winsAndLosses", {
                wins: hero.wins,
                losses: hero.losses,
                games: hero.gamesPlayed,
              })}
            </div>
          </div>
          <Badge
            className={cn(
              "text-sm font-bold",
              hero.winrate >= 60
                ? "bg-green-500"
                : hero.winrate >= 50
                  ? "bg-blue-500"
                  : "bg-gray-500"
            )}
          >
            {hero.winrate.toFixed(1)}%
          </Badge>
        </div>
      ))}
    </div>
  );
}
