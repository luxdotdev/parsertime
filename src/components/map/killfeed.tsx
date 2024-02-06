import { OverviewTable } from "@/components/map/overview-table";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { groupKillsIntoFights, removeDuplicateRows } from "@/lib/utils";
import { PlayerStatRows } from "@/types/prisma";
import prisma from "@/lib/prisma";
import { KillfeedTable } from "@/components/map/killfeed-table";

export async function Killfeed({ id }: { id: number }) {
  const finalRound = await prisma.roundEnd.findFirst({
    where: {
      MapDataId: id,
    },
    orderBy: {
      round_number: "desc",
    },
  });

  const playerTeams = await prisma.matchStart.findFirst({
    where: {
      MapDataId: id,
    },
  });

  const team1Name = playerTeams?.team_1_name;
  const team2Name = playerTeams?.team_2_name;

  const fights = await groupKillsIntoFights(id);

  let team1Kills = 0;
  let team2Kills = 0;

  let team1FightWins = 0;
  let team2FightWins = 0;

  fights.forEach((fight) => {
    fight.kills.forEach((kill) => {
      if (kill.attacker_team === team1Name) {
        team1Kills++;
      } else {
        team2Kills++;
      }
    });

    if (
      fight.kills.filter((kill) => kill.attacker_team === team1Name).length >
      fight.kills.length / 2
    ) {
      team1FightWins++;
    } else {
      team2FightWins++;
    }
  });

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Match Time
            </CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((finalRound?.match_time ?? 0) / 60).toFixed(2)} minutes
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kills</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <span className="text-blue-500">{team1Kills}</span> /{" "}
              <span className="text-red-500">{team2Kills}</span>
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              {team1Name} / {team2Name}
            </p>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deaths</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <span className="text-blue-500">{team2Kills}</span> /{" "}
              <span className="text-red-500">{team1Kills}</span>
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              {team1Name} / {team2Name}
            </p>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fight Wins</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <span className="text-blue-500">{team1FightWins}</span> /{" "}
              <span className="text-red-500">{team2FightWins}</span>
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              {team1Name} / {team2Name}
            </p>
          </CardFooter>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle>Killfeed</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <KillfeedTable
              fights={fights}
              team1={team1Name ?? "Team 1"}
              team2={team2Name ?? "Team 2"}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
