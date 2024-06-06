import "server-only";
import prisma from "@/lib/prisma";
import { cache } from "react";
import { PlayerStatRows } from "@/types/prisma";
import { removeDuplicateRows } from "@/lib/utils";
import { Kill, Prisma, Scrim } from "@prisma/client";
import { HeroName, heroPriority, heroRoleMapping } from "@/types/heroes";

async function getScrimFn(id: number) {
  return await prisma.scrim.findFirst({
    where: { id },
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
              some: { id },
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
 * 1. It first creates a subquery that selects the maximum match time (i.e., the final round time)
 *    for a given map (`MapDataId`). This is achieved by grouping the `PlayerStat` records
 *    by `MapDataId` and calculating the maximum `match_time` for each group.
 * 2. The main query then joins the results of this subquery with the original `PlayerStat` table.
 *    This join is based on matching the `MapDataId` and the `match_time` with the calculated maximum
 *    match time from the subquery.
 * 3. Finally, the query implicitly filters the results to include only those records that match the given `MapDataId`,
 *    effectively returning statistics for players at the final match time of the specified scrim.
 */
async function getFinalRoundStatsFn(id: number) {
  return removeDuplicateRows(
    await prisma.$queryRaw<PlayerStatRows>`
        WITH maxTime AS (
          SELECT
              MAX("match_time") AS max_time
          FROM
              "PlayerStat"
          WHERE
              "MapDataId" = ${id}
        )
        SELECT
            ps.*
        FROM
            "PlayerStat" ps
            INNER JOIN maxTime m ON ps."match_time" = m.max_time
        WHERE
            ps."MapDataId" = ${id}`
  )
    .sort((a, b) => a.player_name.localeCompare(b.player_name))
    .sort(
      (a, b) =>
        heroPriority[heroRoleMapping[a.player_hero as HeroName]] -
        heroPriority[heroRoleMapping[b.player_hero as HeroName]]
    )
    .sort((a, b) => a.player_team.localeCompare(b.player_team));
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
      WITH maxTime AS (
        SELECT
            MAX("match_time") AS max_time
        FROM
            "PlayerStat"
        WHERE
            "MapDataId" = ${id}
      )
      SELECT
          ps.*
      FROM
          "PlayerStat" ps
          INNER JOIN maxTime m ON ps."match_time" = m.max_time
      WHERE
          ps."MapDataId" = ${id}
          AND ps."player_name" = ${playerName}`
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

async function getAllStatsForPlayerFn(scrimIds: number[], name: string) {
  const mapDataIds = await prisma.scrim.findMany({
    where: {
      id: {
        in: scrimIds,
      },
    },
    select: {
      maps: true,
    },
  });

  const mapDataIdSet = new Set<number>();
  mapDataIds.forEach((scrim) => {
    scrim.maps.forEach((map) => {
      mapDataIdSet.add(map.id);
    });
  });

  const mapDataIdArray = Array.from(mapDataIdSet);

  return removeDuplicateRows(
    await prisma.$queryRaw<PlayerStatRows>`
      WITH maxTime AS (
        SELECT
            MAX("match_time") AS max_time,
            "MapDataId"
        FROM
            "PlayerStat"
        WHERE
            "MapDataId" IN (${Prisma.join(mapDataIdArray)})
        GROUP BY
            "MapDataId"
      )
      SELECT
          ps.*
      FROM
          "PlayerStat" ps
          INNER JOIN maxTime m ON ps."match_time" = m.max_time AND ps."MapDataId" = m."MapDataId"
      WHERE
          ps."MapDataId" IN (${Prisma.join(mapDataIdArray)})
          AND ps."player_name" ILIKE ${name}`
  );
}

/**
 * Returns all of the statistics for a specific player.
 * This function is cached for performance.
 *
 * @param {number} scrimIds The IDs of the scrims the player participated in.
 * @param {string} playerName The name of the player.
 * @returns {PlayerStatRows} The statistics for the specified player.
 */
export const getAllStatsForPlayer = cache(getAllStatsForPlayerFn);

async function getAllKillsForPlayerFn(scrimIds: number[], name: string) {
  const mapDataIds = await prisma.scrim.findMany({
    where: {
      id: {
        in: scrimIds,
      },
    },
    select: {
      maps: true,
    },
  });

  const mapDataIdSet = new Set<number>();
  mapDataIds.forEach((scrim) => {
    scrim.maps.forEach((map) => {
      mapDataIdSet.add(map.id);
    });
  });

  const mapDataIdArray = Array.from(mapDataIdSet);

  return await prisma.kill.findMany({
    where: {
      MapDataId: {
        in: mapDataIdArray,
      },
      attacker_name: {
        equals: name,
        mode: "insensitive",
      },
    },
  });
}

/**
 * Returns all of the kills for a specific player.
 * This function is cached for performance.
 *
 * @param {number} scrimIds The IDs of the scrims the player participated in.
 * @param {string} playerName The name of the player.
 * @returns {Kill[]} The kills for the specified player.
 */
export const getAllKillsForPlayer = cache(getAllKillsForPlayerFn);
