import Statistics from "@/components/player/statistics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CardIcon from "@/components/ui/card-icon";
import prisma from "@/lib/prisma";
import {
  removeDuplicateRows,
  removeDuplicateRowsForFletaDeadlift,
} from "@/lib/utils";
import { PlayerStatRows } from "@/types/prisma";

export async function DefaultOverview({
  id,
  playerName,
}: {
  id: number;
  playerName: string;
}) {
  const finalRound = await prisma.roundEnd.findFirst({
    where: {
      MapDataId: id,
    },
    orderBy: {
      round_number: "desc",
    },
  });

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

  const team = playerStatsByFinalRound[0]?.player_team;

  const teamFinalBlows = removeDuplicateRowsForFletaDeadlift(
    await prisma.playerStat.findMany({
      where: {
        MapDataId: id,
        player_team: team,
        round_number: finalRound?.round_number,
      },
      select: {
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
            <CardTitle className="text-sm font-medium">
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
              {playerFletaDeadliftPercentage.toFixed(2)}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sales</CardTitle>
            <CardIcon>
              <rect width="20" height="14" x="2" y="5" rx="2" />
              <path d="M2 10h20" />
            </CardIcon>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+12,234</div>
            <p className="text-xs text-muted-foreground">
              +19% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Now</CardTitle>
            <CardIcon>
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </CardIcon>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+573</div>
            <p className="text-xs text-muted-foreground">
              +201 since last hour
            </p>
          </CardContent>
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
