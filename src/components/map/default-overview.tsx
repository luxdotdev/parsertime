import { OverviewTable } from "@/components/map/overview-table";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { removeDuplicateRows } from "@/lib/utils";
import { PlayerStatRows } from "@/types/prisma";
import prisma from "@/lib/prisma";
import CardIcon from "@/components/ui/card-icon";
import { $Enums } from "@prisma/client";

export async function DefaultOverview({ id }: { id: number }) {
  const finalRound = await prisma.roundEnd.findFirst({
    where: {
      MapDataId: id,
    },
    orderBy: {
      round_number: "desc",
    },
  });

  const matchDetails = await prisma.matchStart.findFirst({
    where: {
      MapDataId: id,
    },
  });

  const team1Captures = await prisma.objectiveCaptured.findMany({
    where: {
      MapDataId: id,
      capturing_team: matchDetails?.team_1_name ?? "Team 1",
    },
  });

  const team2Captures = await prisma.objectiveCaptured.findMany({
    where: {
      MapDataId: id,
      capturing_team: matchDetails?.team_2_name ?? "Team 2",
    },
  });

  const mapType = matchDetails ? matchDetails.map_type : $Enums.MapType.Control;

  /**
   * This query performs the following operations:
   * 1. It first creates a subquery that selects the maximum round number (i.e., the final round)
   *    for a given map (`MapDataId`). This is achieved by grouping the `PlayerStat` records
   *    by `MapDataId` and calculating the maximum `round_number` for each group.
   * 2. The main query then joins the results of this subquery with the original `PlayerStat` table.
   *    This join is based on matching the `MapDataId` and the `round_number` with the calculated maximum
   *    round number from the subquery.
   * 3. Finally, the query filters the results to include only those records that match the given `MapDataId`,
   *    effectively returning statistics for players in the final round of the specified scrim.
   */
  const playerStatRowsByFinalRound = removeDuplicateRows(
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
          ps.MapDataId = ${id}`
  )
    // sort by team name
    .sort((a, b) => a.player_team.localeCompare(b.player_team));

  function calculateScore() {
    switch (mapType) {
      case $Enums.MapType.Control:
        return `${finalRound?.team_1_score} - ${finalRound?.team_2_score}`;
      case $Enums.MapType.Escort:
        // account for game setting score to 3 to ensure map completion
        return `${team1Captures.length} - ${team2Captures.length}`;
      case $Enums.MapType.Flashpoint:
        return `${finalRound?.team_1_score} - ${finalRound?.team_2_score}`;
      case $Enums.MapType.Hybrid:
        // account for game setting score to 3 to ensure map completion
        return `${team1Captures.length} - ${team2Captures.length}`;
      case $Enums.MapType.Push:
        return "Not supported for Push";
      default:
        return "N/A";
    }
  }

  function calculateWinner() {
    if (!matchDetails) return "N/A";
    if (!finalRound) return "N/A";

    switch (mapType) {
      case $Enums.MapType.Control:
        return finalRound.team_1_score > finalRound.team_2_score
          ? matchDetails.team_1_name
          : matchDetails.team_2_name;

      case $Enums.MapType.Escort:
        if (team1Captures.length === 0) return matchDetails.team_2_name;
        if (team2Captures.length === 0) return matchDetails.team_1_name;

        if (team1Captures.length === team2Captures.length) {
          return team1Captures[team1Captures.length - 1]?.match_time_remaining >
            team2Captures[team2Captures.length - 1]?.match_time_remaining
            ? matchDetails.team_1_name
            : matchDetails.team_2_name;
        }

        return team1Captures.length > team2Captures.length
          ? matchDetails.team_1_name
          : matchDetails.team_2_name;

      case $Enums.MapType.Flashpoint:
        return finalRound.team_1_score > finalRound.team_2_score
          ? matchDetails.team_1_name
          : matchDetails.team_2_name;

      case $Enums.MapType.Hybrid:
        if (!team1Captures) return matchDetails.team_2_name;
        if (!team2Captures) return matchDetails.team_1_name;

        if (team1Captures.length === team2Captures.length) {
          return team1Captures[team1Captures.length - 1]?.match_time_remaining >
            team2Captures[team2Captures.length - 1]?.match_time_remaining
            ? matchDetails.team_1_name
            : matchDetails.team_2_name;
        }

        return team1Captures.length > team2Captures.length
          ? matchDetails.team_1_name
          : matchDetails.team_2_name;

      case $Enums.MapType.Push:
        return "Not supported for Push";
      default:
        return "N/A";
    }
  }

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
            <CardTitle className="text-sm font-medium">Score</CardTitle>
            <CardIcon>
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
              <path d="M4 22h16" />
              <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
              <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
            </CardIcon>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{calculateScore()}</div>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              {mapType !== $Enums.MapType.Push
                ? `Winner: ${calculateWinner()}`
                : "Not supported for Push due to limitations with the scrim code. :("}
            </p>
          </CardFooter>
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <OverviewTable playerStats={playerStatRowsByFinalRound} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
