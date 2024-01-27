import { OverviewTable } from "@/components/map/overview-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { removeDuplicateRows } from "@/lib/utils";
import { PlayerStatRows } from "@/types/prisma";
import prisma from "@/lib/prisma";

export async function DefaultOverview({ id }: { id: number }) {
  const playerStats = await prisma.playerStat.findMany({
    where: {
      MapDataId: id,
    },
  });

  const finalRound = await prisma.roundEnd.findFirst({
    where: {
      MapDataId: id,
    },
    orderBy: {
      round_number: "desc",
    },
  });

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
                  MAX(round_number) as max_round
              FROM
                  PlayerStat
              WHERE
                  MapDataId = ${id}
              GROUP BY
                  MapDataId
          ) as max_rounds ON ps.MapDataId = max_rounds.MapDataId
          AND ps.round_number = max_rounds.max_round
      WHERE
          ps.MapDataId = ${id}`
  )
    // sort by team name
    .sort((a, b) => a.player_team.localeCompare(b.player_team));

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Match Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((finalRound?.match_time ?? 0) / 60).toFixed(2)} minutes
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subscriptions</CardTitle>
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
            <div className="text-2xl font-bold">+2350</div>
            <p className="text-xs text-muted-foreground">
              +180.1% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sales</CardTitle>
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
              <rect width="20" height="14" x="2" y="5" rx="2" />
              <path d="M2 10h20" />
            </svg>
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
