import "server-only";
import prisma from "@/lib/prisma";
import { cache } from "react";
import { PlayerStatRows } from "@/types/prisma";
import { removeDuplicateRows } from "@/lib/utils";
import { Scrim } from "@prisma/client";

async function getScrimFn(id: number) {
  return await prisma.scrim.findFirst({
    where: {
      id: id,
    },
  });
}

export const getScrim = cache(getScrimFn);

async function getUserViewableScrimsFn(id: string) {
  return await prisma.scrim.findMany({
    where: {
      OR: [
        {
          creatorId: id,
        },
        {
          Team: {
            users: {
              some: {
                id: id,
              },
            },
          },
        },
      ],
    },
  });
}

/**
 * Returns the scrims that a user is allowed to view.
 *
 * @param {string} id The ID of the user.
 * @returns {Scrim[]} The scrims that the user is allowed to view.
 */
export const getUserViewableScrims = cache(getUserViewableScrimsFn);

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
 * @param {number} id The ID of the map.
 * @returns {PlayerStatRows} The statistics for the final round of the specified map.
 * @see {@link PlayerStatRows}
 */
export const getFinalRoundStats = cache(getFinalRoundStatsFn);

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
 * @param {number} id The ID of the map.
 * @param {string} playerName The name of the player.
 * @returns {PlayerStatRows} The statistics for the final round of the specified map for the specified player.
 */
export const getPlayerFinalStats = cache(getFinalRoundStatsForPlayerFn);
