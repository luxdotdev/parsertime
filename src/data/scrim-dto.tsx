import "server-only";
import prisma from "@/lib/prisma";
import { cache } from "react";
import { PlayerStatRows } from "@/types/prisma";
import { removeDuplicateRows } from "@/lib/utils";

async function getScrimFn(id: number) {
  return await prisma.scrim.findFirst({
    where: {
      id: id,
    },
  });
}

export const getScrim = cache(async (id: number) => {
  return getScrimFn(id);
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
async function getFinalRoundStatsFn(id: number) {
  return (
    removeDuplicateRows(
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
      .sort((a, b) => a.player_team.localeCompare(b.player_team))
  );
}

/**
 * Returns the statistics for the final round of a map.
 * This function is cached for performance.
 *
 * @param id The ID of the map.
 * @returns The statistics for the final round of the specified map.
 * @see PlayerStatRows
 */
export const getFinalRoundStats = cache(async (id: number) => {
  return getFinalRoundStatsFn(id);
});

async function getFinalRoundStatsForPlayerFn(id: number, playerName: string) {
  return removeDuplicateRows(
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
}

/**
 * Returns the statistics for the final round of a map for a specific player.
 * This function is cached for performance.
 *
 * @param id The ID of the map.
 * @param playerName The name of the player.
 */
export const getPlayerFinalStats = cache(
  async (id: number, playerName: string) => {
    return getFinalRoundStatsForPlayerFn(id, playerName);
  }
);
