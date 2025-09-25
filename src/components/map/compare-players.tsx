import { PlayerCard } from "@/components/map/player-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import prisma from "@/lib/prisma";
import { type HeroName, heroRoleMapping } from "@/types/heroes";
import { getTranslations } from "next-intl/server";

type PlayerToSort = {
  player_name: string;
  player_hero: string;
};

function sortByRole(a: PlayerToSort, b: PlayerToSort) {
  const rolePriority: Record<"Tank" | "Damage" | "Support", number> = {
    Damage: 1,
    Tank: 2,
    Support: 3,
  };

  const aRolePriority =
    rolePriority[heroRoleMapping[a.player_hero as HeroName]];
  const bRolePriority =
    rolePriority[heroRoleMapping[b.player_hero as HeroName]];

  if (aRolePriority === bRolePriority) {
    // If roles are the same, optionally sort by player name
    return a.player_name.localeCompare(b.player_name);
  }

  return aRolePriority - bRolePriority;
}

export async function ComparePlayers({ id }: { id: number }) {
  const t = await getTranslations("mapPage.compare");

  const teamNames = await prisma.matchStart.findFirst({
    where: {
      MapDataId: id,
    },
    select: {
      team_1_name: true,
      team_2_name: true,
    },
  });

  const [team1Players, team2Players] = await Promise.all([
    prisma.playerStat.findMany({
      where: {
        MapDataId: id,
        player_team: teamNames?.team_1_name,
      },
      select: {
        player_name: true,
        player_hero: true,
      },
    }),
    prisma.playerStat.findMany({
      where: {
        MapDataId: id,
        player_team: teamNames?.team_2_name,
      },
      select: {
        player_name: true,
        player_hero: true,
      },
    }),
  ]);

  const team1PlayersSorted = team1Players.sort((a, b) => {
    return sortByRole(a, b);
  });

  const team1PlayersUnique = Array.from(
    new Set(team1PlayersSorted.map((player) => player.player_name))
  );

  const team2PlayersSorted = team2Players.sort((a, b) => {
    return sortByRole(a, b);
  });

  const team2PlayersUnique = Array.from(
    new Set(team2PlayersSorted.map((player) => player.player_name))
  );

  return (
    <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
      <Card className="col-span-3">
        <CardHeader>
          <CardTitle>{teamNames?.team_1_name ?? t("team1")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="0" className="space-y-4">
            <TabsList>
              {team1PlayersUnique.map((player, index) => (
                <TabsTrigger key={player} value={index.toString()}>
                  {player}
                </TabsTrigger>
              ))}
            </TabsList>
            {team1PlayersUnique.map((player, index) => (
              <TabsContent key={player} value={index.toString()}>
                <PlayerCard id={id} playerName={player} />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
      <Card className="col-span-3">
        <CardHeader>
          <CardTitle>{teamNames?.team_2_name ?? t("team2")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="0" className="space-y-4">
            <TabsList>
              {team2PlayersUnique.map((player, index) => (
                <TabsTrigger key={player} value={index.toString()}>
                  {player}
                </TabsTrigger>
              ))}
            </TabsList>
            {team2PlayersUnique.map((player, index) => (
              <TabsContent key={player} value={index.toString()}>
                <PlayerCard id={id} playerName={player} />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
