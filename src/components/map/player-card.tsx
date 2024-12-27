import AllHeroes from "@/components/player/all-heroes";
import SpecificHero from "@/components/player/specific-hero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getPlayerFinalStats } from "@/data/scrim-dto";
import { getTranslations } from "next-intl/server";

type Props = { id: number; playerName: string };

export default async function PlayerCard({ playerName, id }: Props) {
  const t = await getTranslations("mapPage.compare.playerCard");

  const playerStatsByFinalRound = await getPlayerFinalStats(id, playerName);

  const playerStats = playerStatsByFinalRound.filter(
    (stat) => stat.hero_time_played > 0
  );

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
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="pl-4">
          {heroesPlayed.length > 1 && (
            <Tabs defaultValue="all-heroes" className="space-y-4">
              <TabsList>
                <TabsTrigger value="all-heroes">
                  {t("allHeroes.title")}
                </TabsTrigger>
                {heroesPlayed.map((hero) => {
                  return (
                    <TabsTrigger key={hero} value={hero}>
                      {hero}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
              <TabsContent value="all-heroes" className="space-y-4">
                <AllHeroes playerStats={playerStats} showTable={false} />
              </TabsContent>
              {heroesPlayed.map((hero) => {
                return (
                  <TabsContent key={hero} value={hero} className="space-y-4">
                    <SpecificHero
                      playerStats={playerStats.filter(
                        (stat) => stat.player_hero === hero
                      )}
                      showTable={false}
                    />
                  </TabsContent>
                );
              })}
            </Tabs>
          )}
          {heroesPlayed.length === 1 && (
            <SpecificHero playerStats={playerStats} showTable={false} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
