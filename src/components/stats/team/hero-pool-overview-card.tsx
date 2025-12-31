"use client";

import { HeroWinratesCard } from "@/components/stats/team/hero-winrates-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HeroPoolAnalysis } from "@/data/team-hero-pool-dto";
import { cn, toHero, toTimestampWithHours, useHeroNames } from "@/lib/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";

type HeroPoolOverviewCardProps = {
  heroPool: HeroPoolAnalysis;
};

const roleColors = {
  Tank: "border-blue-500 bg-blue-50 dark:bg-blue-950/30",
  Damage: "border-red-500 bg-red-50 dark:bg-red-950/30",
  Support: "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30",
};

export function HeroPoolOverviewCard({ heroPool }: HeroPoolOverviewCardProps) {
  const t = useTranslations("teamStatsPage.heroPoolOverviewCard");
  const heroNames = useHeroNames();
  const hasData = heroPool.diversity.totalUniqueHeroes > 0;

  if (!hasData) {
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

  function getDiversityRating(score: number): string {
    if (score >= 70) return t("excellent");
    if (score >= 50) return t("good");
    if (score >= 30) return t("average");
    return t("limited");
  }

  function getDiversityColor(score: number): string {
    if (score >= 70) return "text-green-600 dark:text-green-400";
    if (score >= 50) return "text-blue-600 dark:text-blue-400";
    if (score >= 30) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="bg-muted/50 grid gap-4 rounded-lg p-4 md:grid-cols-4">
            <div>
              <div className="text-muted-foreground text-sm">
                {t("totalHeroes")}
              </div>
              <div className="text-3xl font-bold">
                {heroPool.diversity.totalUniqueHeroes}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground text-sm">
                {t("effectivePool")}
              </div>
              <div className="text-3xl font-bold">
                {heroPool.diversity.effectiveHeroPool}
              </div>
              <div className="text-muted-foreground text-xs">
                {t("minGames")}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground text-sm">
                {t("diversityScore")}
              </div>
              <div
                className={cn(
                  "text-3xl font-bold",
                  getDiversityColor(heroPool.diversity.diversityScore)
                )}
              >
                {heroPool.diversity.diversityScore.toFixed(0)}%
              </div>
              <div className="text-muted-foreground text-xs">
                {getDiversityRating(heroPool.diversity.diversityScore)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground text-sm">
                {t("specialists")}
              </div>
              <div className="text-3xl font-bold">
                {heroPool.specialists.length}
              </div>
              <div className="text-muted-foreground text-xs">
                {t("minOwnership")}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <h3 className="font-semibold">{t("mostPlayedByRole")}</h3>

              {(["Tank", "Damage", "Support"] as const).map((role) => {
                const heroes = heroPool.mostPlayedByRole[role].slice(0, 5);
                if (heroes.length === 0) return null;

                return (
                  <div
                    key={role}
                    className={cn("rounded-lg border p-4", roleColors[role])}
                  >
                    <h4 className="mb-3 font-semibold">{role}</h4>
                    <div className="space-y-2">
                      {heroes.map((hero, idx) => (
                        <div
                          key={hero.heroName}
                          className="bg-background flex items-center gap-3 rounded-lg p-2"
                        >
                          <span className="text-muted-foreground text-sm font-bold">
                            #{idx + 1}
                          </span>
                          <div className="relative h-10 w-10 overflow-hidden rounded">
                            <Image
                              src={`/heroes/${toHero(hero.heroName)}.png`}
                              alt={
                                heroNames.get(toHero(hero.heroName)) ??
                                hero.heroName
                              }
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium">
                              {heroNames.get(toHero(hero.heroName)) ??
                                hero.heroName}
                            </div>
                            <div className="text-muted-foreground text-xs">
                              {toTimestampWithHours(hero.totalPlaytime)} •{" "}
                              {t("gamesPlayed", { count: hero.gamesPlayed })}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {t("players", { count: hero.playedBy.length })}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <HeroWinratesCard heroPool={heroPool} />
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="mb-2 text-sm font-semibold">
              {t("roleDistribution")}
            </h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {heroPool.diversity.heroesPerRole.Tank}
                </div>
                <div className="text-muted-foreground text-xs">
                  {t("tankHeroes")}
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {heroPool.diversity.heroesPerRole.Damage}
                </div>
                <div className="text-muted-foreground text-xs">
                  {t("dpsHeroes")}
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {heroPool.diversity.heroesPerRole.Support}
                </div>
                <div className="text-muted-foreground text-xs">
                  {t("supportHeroes")}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
