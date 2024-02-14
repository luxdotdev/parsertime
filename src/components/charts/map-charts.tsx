import { DamageByRoundChart } from "@/components/charts/damage-by-round-chart";
import { KillsByFightChart } from "@/components/charts/kills-by-fight-chart";
import { KillsByRoleChart } from "@/components/charts/kills-by-role-chart";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import prisma from "@/lib/prisma";
import { Kill, PlayerStat } from "@prisma/client";

async function groupKillsByInterval(id: number, maxInterval: number) {
  // Fetch the data
  const kills = await prisma.kill.findMany({
    where: {
      MapDataId: id,
    },
  });

  const groupedKills: Kill[][] = [];
  let currentGroup: Kill[] = [];

  kills.forEach((kill, index) => {
    // Add the first kill to the current group
    if (currentGroup.length === 0) {
      currentGroup.push(kill);
    } else {
      // Calculate the time difference between the current kill and the previous one
      const timeDifference = kill.match_time - kills[index - 1].match_time;

      // If the time difference is within the maxInterval, add it to the current group
      if (timeDifference <= maxInterval) {
        currentGroup.push(kill);
      } else {
        // If the difference is greater than maxInterval, start a new group
        groupedKills.push(currentGroup);
        currentGroup = [kill]; // Start a new group with the current kill
      }
    }
  });

  // Add the last group if it's not empty
  if (currentGroup.length > 0) {
    groupedKills.push(currentGroup);
  }

  return groupedKills;
}

export async function MapCharts({ id }: { id: number }) {
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
  const team2Name = teams?.team_2_name ?? "Team 2";
  const teamNames = [team1Name, team2Name] as const;

  const fights = await groupKillsByInterval(id, 15);

  const team1Kills = await prisma.kill.findMany({
    where: {
      MapDataId: id,
      attacker_team: team1Name,
    },
  });

  const team2Kills = await prisma.kill.findMany({
    where: {
      MapDataId: id,
      attacker_team: team2Name,
    },
  });

  const numberOfRounds = await prisma.roundStart.count({
    where: {
      MapDataId: id,
    },
  });

  const team1DamageByRound = await prisma.playerStat.groupBy({
    by: ["round_number"],
    where: {
      MapDataId: id,
      player_team: team1Name,
    },
    _sum: {
      hero_damage_dealt: true,
    },
  });

  const team2DamageByRound = await prisma.playerStat.groupBy({
    by: ["round_number"],
    where: {
      MapDataId: id,
      player_team: team2Name,
    },
    _sum: {
      hero_damage_dealt: true,
    },
  });

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Kills By Fight Chart</CardTitle>
        </CardHeader>
        <CardContent className="pl-2">
          <KillsByFightChart fights={fights} teamNames={teamNames} />
        </CardContent>
        <CardFooter>
          <p className="text-sm text-gray-500">
            Kills are grouped by 15 second intervals. This chart shows the
            cumulative kills for each team at each interval. The x-axis
            represents the time in seconds, and the y-axis represents the
            cumulative kills. Team 1 is represented with positive numbers, while
            Team 2 is represented with negative numbers. The chart resets to 0
            after each fight.
          </p>
        </CardFooter>
      </Card>
      <Card className="col-span-3">
        <CardHeader>
          <CardTitle>Kills By Role Chart</CardTitle>
        </CardHeader>
        <CardContent className="pl-2">
          <KillsByRoleChart
            team1Kills={team1Kills}
            team2Kills={team2Kills}
            teamNames={teamNames}
          />
        </CardContent>
        <CardFooter>
          <p className="text-sm text-gray-500">
            This chart shows the number of kills by role for each team. The
            roles are split into Tank, Damage, and Support. The x-axis
            represents the role, and the y-axis represents the number of kills.
          </p>
        </CardFooter>
      </Card>
      <Card className="col-span-3">
        <CardHeader>
          <CardTitle>Hero Damage By Round Chart</CardTitle>
        </CardHeader>
        <CardContent className="pl-2">
          <DamageByRoundChart
            team1DamageByRound={team1DamageByRound}
            team2DamageByRound={team2DamageByRound}
            teamNames={teamNames}
          />
        </CardContent>
        <CardFooter>
          <p className="text-sm text-gray-500">
            This chart shows the hero damage done by round for each team. The
            x-axis represents the round, and the y-axis represents the damage
            done. Note that the damage is cumulative, so the damage done in
            round 2 includes the damage done in round 1.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
