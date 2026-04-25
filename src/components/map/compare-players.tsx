import { PlayerCard } from "@/components/map/player-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { resolveMapDataId } from "@/lib/map-data-resolver";
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
    return a.player_name.localeCompare(b.player_name);
  }

  return aRolePriority - bRolePriority;
}

function uniquePlayers(players: PlayerToSort[]) {
  return Array.from(new Set([...players].sort(sortByRole).map((p) => p.player_name)));
}

function TeamColumn({
  id,
  teamLabel,
  players,
}: {
  id: number;
  teamLabel: string;
  players: string[];
}) {
  if (players.length === 0) return null;

  return (
    <div className="space-y-4">
      <span className="text-muted-foreground font-mono text-[0.6875rem] tracking-[0.06em] uppercase">
        {teamLabel}
      </span>
      <Tabs defaultValue="0" className="space-y-4">
        <TabsList>
          {players.map((player, index) => (
            <TabsTrigger key={player} value={index.toString()}>
              {player}
            </TabsTrigger>
          ))}
        </TabsList>
        {players.map((player, index) => (
          <TabsContent key={player} value={index.toString()}>
            <PlayerCard id={id} playerName={player} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

export async function ComparePlayers({ id }: { id: number }) {
  const t = await getTranslations("mapPage.compare");
  const mapDataId = await resolveMapDataId(id);

  const teamNames = await prisma.matchStart.findFirst({
    where: { MapDataId: mapDataId },
    select: { team_1_name: true, team_2_name: true },
  });

  const [team1Players, team2Players] = await Promise.all([
    prisma.playerStat.findMany({
      where: { MapDataId: mapDataId, player_team: teamNames?.team_1_name },
      select: { player_name: true, player_hero: true },
    }),
    prisma.playerStat.findMany({
      where: { MapDataId: mapDataId, player_team: teamNames?.team_2_name },
      select: { player_name: true, player_hero: true },
    }),
  ]);

  const team1PlayersUnique = uniquePlayers(team1Players);
  const team2PlayersUnique = uniquePlayers(team2Players);

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <TeamColumn
        id={id}
        teamLabel={teamNames?.team_1_name ?? t("team1")}
        players={team1PlayersUnique}
      />
      <TeamColumn
        id={id}
        teamLabel={teamNames?.team_2_name ?? t("team2")}
        players={team2PlayersUnique}
      />
    </div>
  );
}
