import { AllHeroes } from "@/components/player/all-heroes";
import { SpecificHero } from "@/components/player/specific-hero";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getHeroNames, toHero } from "@/lib/utils";
import type { PlayerStat } from "@prisma/client";
import { getTranslations } from "next-intl/server";

export async function Statistics({
  playerStats,
}: {
  playerStats: PlayerStat[];
}) {
  const t = await getTranslations("mapPage.player.overview");
  const heroNames = await getHeroNames();

  const heroesPlayed = playerStats
    .sort((a, b) => b.hero_time_played - a.hero_time_played)
    .map((stat) => stat.player_hero);

  return (
    <section aria-labelledby="player-statistics-heading" className="pt-2">
      <h2
        id="player-statistics-heading"
        className="text-muted-foreground mb-3 font-mono text-[0.6875rem] tracking-[0.06em] uppercase"
      >
        {t("playerStats")}
      </h2>
      {heroesPlayed.length > 1 && (
        <Tabs defaultValue="all-heroes" className="space-y-4">
          <TabsList aria-label="Hero breakdown">
            <TabsTrigger value="all-heroes">{t("allHeroes")}</TabsTrigger>
            {heroesPlayed.map((hero) => (
              <TabsTrigger key={hero} value={hero}>
                {heroNames.get(toHero(hero)) ?? hero}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="all-heroes" className="space-y-4">
            <AllHeroes playerStats={playerStats} />
          </TabsContent>
          {heroesPlayed.map((hero) => (
            <TabsContent key={hero} value={hero} className="space-y-4">
              <SpecificHero
                playerStats={playerStats.filter(
                  (stat) => stat.player_hero === hero
                )}
              />
            </TabsContent>
          ))}
        </Tabs>
      )}
      {heroesPlayed.length === 1 && <SpecificHero playerStats={playerStats} />}
    </section>
  );
}
