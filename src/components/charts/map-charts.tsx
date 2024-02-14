import { KillsByFightChart } from "@/components/charts/kills-by-fight-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import prisma from "@/lib/prisma";
import { Kill } from "@prisma/client";

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

  const fights = await groupKillsByInterval(id, 15);
  const teamNames = [team1Name, team2Name] as const;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Kills By Fight Chart</CardTitle>
        </CardHeader>
        <CardContent className="pl-2">
          <KillsByFightChart fights={fights} teamNames={teamNames} />
        </CardContent>
      </Card>
    </div>
  );
}
