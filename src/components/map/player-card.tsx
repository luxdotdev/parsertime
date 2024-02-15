import { removeDuplicateRows } from "@/lib/utils";
import prisma from "@/lib/prisma";
import { PlayerStatRows } from "@/types/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AllHeroes from "@/components/player/all-heroes";
import SpecificHero from "@/components/player/specific-hero";

type Props = { id: number; playerName: string };

export default async function PlayerCard({ playerName, id }: Props) {
  const playerStatsByFinalRound = removeDuplicateRows(
    await prisma.$queryRaw<PlayerStatRows>`
      SELECT
          ps.*
      FROM
          PlayerStat ps
          INNER JOIN (
              SELECT
                  MapDataId,
                  MAX(match_time) as max_time
              FROM
                  PlayerStat
              WHERE
                  MapDataId = ${id}
              GROUP BY
                  MapDataId
          ) as max_time ON ps.MapDataId = max_time.MapDataId
          AND ps.match_time = max_time.max_time
      WHERE
          ps.MapDataId = ${id}
          AND ps.player_name = ${playerName}`
  );

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
          <CardTitle>Player Statistics</CardTitle>
        </CardHeader>
        <CardContent className="pl-4">
          {heroesPlayed.length > 1 && (
            <Tabs defaultValue="all-heroes" className="space-y-4">
              <TabsList>
                <TabsTrigger value="all-heroes">All Heroes</TabsTrigger>
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
