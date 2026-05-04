"use client";

import { HeroWinratesCard } from "@/components/stats/team/hero-winrates-card";
import { SectionHeader } from "@/components/stats/team/section-header";
import { Badge } from "@/components/ui/badge";
import type { HeroPoolAnalysis } from "@/data/team/types";
import { toHero, toTimestampWithHours, useHeroNames } from "@/lib/utils";
import { Heart, Shield, Swords } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";

type HeroPoolOverviewCardProps = {
  heroPool: HeroPoolAnalysis;
};

const roleIcons = {
  Tank: Shield,
  Damage: Swords,
  Support: Heart,
};

export function HeroPoolOverviewCard({ heroPool }: HeroPoolOverviewCardProps) {
  const t = useTranslations("teamStatsPage.heroPoolOverviewCard");
  const heroNames = useHeroNames();
  const hasData = heroPool.diversity.totalUniqueHeroes > 0;

  if (!hasData) {
    return (
      <section className="space-y-4">
        <SectionHeader eyebrow="Heroes · Pool overview" title={t("title")} />
        <p className="text-muted-foreground text-sm">{t("noData")}</p>
      </section>
    );
  }

  function getDiversityRating(score: number): string {
    if (score >= 70) return t("excellent");
    if (score >= 50) return t("good");
    if (score >= 30) return t("average");
    return t("limited");
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <SectionHeader eyebrow="Heroes · Pool overview" title={t("title")} />
        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-1">
            <div className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
              {t("totalHeroes")}
            </div>
            <div className="text-foreground font-mono text-3xl font-bold tabular-nums">
              {heroPool.diversity.totalUniqueHeroes}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
              {t("effectivePool")}
            </div>
            <div className="text-foreground font-mono text-3xl font-bold tabular-nums">
              {heroPool.diversity.effectiveHeroPool}
            </div>
            <div className="text-muted-foreground text-xs">{t("minGames")}</div>
          </div>
          <div className="space-y-1">
            <div className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
              {t("diversityScore")}
            </div>
            <div className="text-primary font-mono text-3xl font-bold tabular-nums">
              {heroPool.diversity.diversityScore.toFixed(0)}%
            </div>
            <div className="text-muted-foreground text-xs">
              {getDiversityRating(heroPool.diversity.diversityScore)}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
              {t("specialists")}
            </div>
            <div className="text-foreground font-mono text-3xl font-bold tabular-nums">
              {heroPool.specialists.length}
            </div>
            <div className="text-muted-foreground text-xs">
              {t("minOwnership")}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-8 md:grid-cols-2">
        <section className="space-y-4">
          <SectionHeader
            eyebrow="Heroes · Most played by role"
            title={t("mostPlayedByRole")}
          />
          <div className="space-y-4">
            {(["Tank", "Damage", "Support"] as const).map((role) => {
              const heroes = heroPool.mostPlayedByRole[role].slice(0, 5);
              if (heroes.length === 0) return null;

              const Icon = roleIcons[role];

              return (
                <div key={role} className="border-border rounded-lg border p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Icon className="text-muted-foreground size-4" />
                    <h4 className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
                      {role}
                    </h4>
                  </div>
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
        </section>

        <HeroWinratesCard heroPool={heroPool} />
      </div>

      <section className="space-y-4 border-t pt-6">
        <h4 className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
          {t("roleDistribution")}
        </h4>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-muted-foreground font-mono text-[10px] tracking-[0.18em] uppercase">
              {t("tankHeroes")}
            </div>
            <div className="font-mono text-2xl font-bold tabular-nums">
              {heroPool.diversity.heroesPerRole.Tank}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground font-mono text-[10px] tracking-[0.18em] uppercase">
              {t("dpsHeroes")}
            </div>
            <div className="font-mono text-2xl font-bold tabular-nums">
              {heroPool.diversity.heroesPerRole.Damage}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground font-mono text-[10px] tracking-[0.18em] uppercase">
              {t("supportHeroes")}
            </div>
            <div className="font-mono text-2xl font-bold tabular-nums">
              {heroPool.diversity.heroesPerRole.Support}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
