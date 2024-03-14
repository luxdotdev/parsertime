import Statistics from "@/components/player/statistics";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import CardIcon from "@/components/ui/card-icon";
import { getPlayerFinalStats } from "@/data/scrim-dto";
import prisma from "@/lib/prisma";
import { groupKillsIntoFights, removeDuplicateRows, round } from "@/lib/utils";

export async function DefaultOverview({
  id,
  playerName,
}: {
  id: number;
  playerName: string;
}) {
  const playerNameDecoded = decodeURIComponent(playerName);

  const finalRound = await prisma.roundEnd.findFirst({
    where: {
      MapDataId: id,
    },
    orderBy: {
      round_number: "desc",
    },
  });

  const playerStatsByFinalRound = await getPlayerFinalStats(
    id,
    playerNameDecoded
  );

  const team = playerStatsByFinalRound[0]?.player_team;

  const teamFinalBlows = removeDuplicateRows(
    await prisma.playerStat.findMany({
      where: {
        MapDataId: id,
        player_team: team,
        round_number: finalRound?.round_number,
      },
      select: {
        id: true,
        final_blows: true,
        player_hero: true,
      },
    })
  );

  const teamTotalFinalBlows = teamFinalBlows.reduce(
    (acc, { final_blows }) => acc + final_blows,
    0
  );

  const playerFinalBlows = playerStatsByFinalRound.reduce(
    (acc, { final_blows }) => acc + final_blows,
    0
  );

  const playerFletaDeadliftPercentage =
    (playerFinalBlows / (teamTotalFinalBlows - playerFinalBlows)) * 100;

  const fights = await groupKillsIntoFights(id);
  const firstKills = fights.map((fight) => fight.kills[0]);
  const playerFirstKills = firstKills.filter(
    (kill) => kill.attacker_name === playerNameDecoded
  );

  const playerFirstDeaths = firstKills.filter(
    (kill) => kill.victim_name === playerNameDecoded
  );

  const firstPickPercentage = (playerFirstKills.length / fights.length) * 100;
  const firstDeathPercentage = (playerFirstDeaths.length / fights.length) * 100;

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Match Time
            </CardTitle>
            <CardIcon>
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </CardIcon>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((finalRound?.match_time ?? 0) / 60).toFixed(2)} minutes
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium align-baseline">
              Fleta Deadlift Percentage
            </CardTitle>
            <CardIcon>
              <path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15" />
              <path d="M11 12 5.12 2.2" />
              <path d="m13 12 5.88-9.8" />
              <path d="M8 7h8" />
              <circle cx="12" cy="17" r="5" />
              <path d="M12 18v-2h-.5" />
            </CardIcon>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {round(playerFletaDeadliftPercentage)}%
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              A Fleta Deadlift is when a player earns 50% of their team&apos;s
              final blows.
            </p>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              First Pick Percentage
            </CardTitle>
            <CardIcon>
              <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
              <line x1="13" x2="19" y1="19" y2="13" />
              <line x1="16" x2="20" y1="16" y2="20" />
              <line x1="19" x2="21" y1="21" y2="19" />
            </CardIcon>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {round(firstPickPercentage)}%
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              Out of {fights.length} fights, {playerNameDecoded} got the first
              pick {playerFirstKills.length} times.
            </p>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              First Death Percentage
            </CardTitle>
            <CardIcon>
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </CardIcon>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {round(firstDeathPercentage)}%
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              Out of {fights.length} fights, {playerNameDecoded} died first{" "}
              {playerFirstDeaths.length} times.
            </p>
          </CardFooter>
        </Card>
      </div>
      <Statistics
        playerStats={playerStatsByFinalRound.filter(
          (stat) => stat.hero_time_played > 0
        )}
      />
    </>
  );
}
