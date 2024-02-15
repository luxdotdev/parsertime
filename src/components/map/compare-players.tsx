import PlayerCard from "@/components/map/player-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import prisma from "@/lib/prisma";
import { HeroName, heroRoleMapping } from "@/types/heroes";

export async function ComparePlayers({ id }: { id: number }) {
  const teamNames = await prisma.matchStart.findFirst({
    where: {
      MapDataId: id,
    },
    select: {
      team_1_name: true,
      team_2_name: true,
    },
  });

  const team1Players = await prisma.playerStat.findMany({
    where: {
      MapDataId: id,
      player_team: teamNames?.team_1_name,
    },
    select: {
      player_name: true,
      player_hero: true,
    },
  });

  const rolePriority: Record<"Tank" | "Damage" | "Support", number> = {
    Damage: 1,
    Tank: 2,
    Support: 3,
  };

  const team1PlayersSorted = team1Players.sort((a, b) => {
    const aRolePriority =
      rolePriority[heroRoleMapping[a.player_hero as HeroName]];
    const bRolePriority =
      rolePriority[heroRoleMapping[b.player_hero as HeroName]];

    if (aRolePriority === bRolePriority) {
      // If roles are the same, optionally sort by player name
      return a.player_name.localeCompare(b.player_name);
    }

    return aRolePriority - bRolePriority;
  });

  const team1PlayersUnique = Array.from(
    new Set(team1PlayersSorted.map((player) => player.player_name))
  );

  const team2Players = await prisma.playerStat.findMany({
    where: {
      MapDataId: id,
      player_team: teamNames?.team_2_name,
    },
    select: {
      player_name: true,
      player_hero: true,
    },
  });

  const team2PlayersSorted = team2Players.sort((a, b) => {
    const aRolePriority =
      rolePriority[heroRoleMapping[a.player_hero as HeroName]];
    const bRolePriority =
      rolePriority[heroRoleMapping[b.player_hero as HeroName]];

    if (aRolePriority === bRolePriority) {
      // If roles are the same, optionally sort by player name
      return a.player_name.localeCompare(b.player_name);
    }

    return aRolePriority - bRolePriority;
  });

  const team2PlayersUnique = Array.from(
    new Set(team2PlayersSorted.map((player) => player.player_name))
  );

  return (
    <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
      <Card className="col-span-3">
        <CardHeader>
          <CardTitle>{teamNames?.team_1_name || "Team 1"}</CardTitle>
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
          <CardTitle>{teamNames?.team_2_name || "Team 2"}</CardTitle>
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
