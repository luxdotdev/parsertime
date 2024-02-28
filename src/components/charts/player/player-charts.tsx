import { DamageByRoundChart } from "@/components/charts/player/damage-by-round-chart";
import { HealingByRoundChart } from "@/components/charts/player/healing-by-round-chart";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getPlayerFinalStats } from "@/data/scrim-dto";
import { sumStatByRound } from "@/lib/player-charts";
import prisma from "@/lib/prisma";
import { HeroName, heroRoleMapping } from "@/types/heroes";

type Props = {
  id: number;
  playerName: string;
};

export async function PlayerCharts({ id, playerName }: Props) {
  const teams = await prisma.matchStart.findFirst({
    where: {
      MapDataId: id,
    },
    select: {
      team_1_name: true,
      team_2_name: true,
    },
  });

  const team1Name = teams?.team_1_name ?? "Team 1";

  const playerDamageByRound = await prisma.playerStat.findMany({
    where: {
      MapDataId: id,
      player_name: playerName,
    },
    select: {
      hero_damage_dealt: true,
      round_number: true,
      player_hero: true,
    },
  });

  const dmgSumByRound = sumStatByRound(
    playerDamageByRound,
    "hero_damage_dealt"
  );

  const playerHealingByRound = await prisma.playerStat.findMany({
    where: {
      MapDataId: id,
      player_name: playerName,
    },
    select: {
      healing_dealt: true,
      round_number: true,
      player_hero: true,
    },
  });

  const healingSumByRound = sumStatByRound(
    playerHealingByRound,
    "healing_dealt"
  );

  const playerTeamName = await prisma.playerStat.findFirst({
    where: {
      MapDataId: id,
      player_name: playerName,
    },
    select: {
      player_team: true,
    },
  });

  const playerTeam =
    playerTeamName?.player_team === team1Name ? "Team1" : "Team2";

  const finalStats = await getPlayerFinalStats(id, playerName);

  const mostPlayedHero = finalStats.filter(
    (stat) =>
      stat.hero_time_played ===
      Math.max(...finalStats.map((stat) => stat.hero_time_played))
  )[0].player_hero as HeroName;

  const playerRole = heroRoleMapping[mostPlayedHero];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
      <Card className="col-span-3">
        <CardHeader>
          <CardTitle>Hero Damage By Round Chart</CardTitle>
        </CardHeader>
        <CardContent className="pl-2">
          <DamageByRoundChart
            playerDamageByRound={dmgSumByRound}
            playerName={playerName}
            playerTeam={playerTeam}
          />
        </CardContent>
        <CardFooter>
          <p className="text-sm text-gray-500">
            This chart shows the hero damage done by round for {playerName}. The
            x-axis represents the round, and the y-axis represents the damage
            done. Note that the damage is NOT cumulative, so the damage done in
            round 2 does not include the damage done in round 1.
          </p>
        </CardFooter>
      </Card>
      {playerRole === "Support" && (
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Healing By Round Chart</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <HealingByRoundChart
              playerHealingByRound={healingSumByRound}
              playerName={playerName}
              playerTeam={playerTeam}
            />
          </CardContent>
          <CardFooter>
            <p className="text-sm text-gray-500">
              This chart shows the healing done by round for {playerName}. The
              x-axis represents the round, and the y-axis represents the healing
              done. Note that the healing is NOT cumulative, so the healing done
              in round 2 does not include the healing done in round 1.
            </p>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
