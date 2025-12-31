import { AllHeroes } from "@/components/player/all-heroes";
import { SpecificHero } from "@/components/player/specific-hero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    .sort(
      // sort by time played
      (a, b) => b.hero_time_played - a.hero_time_played
    )
    .map((stat) => stat.player_hero);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>{t("playerStats")}</CardTitle>
        </CardHeader>
        <CardContent className="pl-4">
          {heroesPlayed.length > 1 && (
            <Tabs defaultValue="all-heroes" className="space-y-4">
              <TabsList>
                <TabsTrigger value="all-heroes">{t("allHeroes")}</TabsTrigger>
                {heroesPlayed.map((hero) => {
                  return (
                    <TabsTrigger key={hero} value={hero}>
                      {heroNames.get(toHero(hero)) ?? hero}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
              <TabsContent value="all-heroes" className="space-y-4">
                <AllHeroes playerStats={playerStats} />
              </TabsContent>
              {heroesPlayed.map((hero) => {
                return (
                  <TabsContent key={hero} value={hero} className="space-y-4">
                    <SpecificHero
                      playerStats={playerStats.filter(
                        (stat) => stat.player_hero === hero
                      )}
                    />
                  </TabsContent>
                );
              })}
            </Tabs>
          )}
          {heroesPlayed.length === 1 && (
            <SpecificHero playerStats={playerStats} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
