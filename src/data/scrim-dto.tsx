import prisma from "@/lib/prisma";
import { removeDuplicateRows } from "@/lib/utils";
import { calculateWinner } from "@/lib/winrate";
import { type HeroName, heroPriority, heroRoleMapping } from "@/types/heroes";
import {
  type MatchStart,
  type ObjectiveCaptured,
  type PlayerStat,
  Prisma,
  type RoundEnd,
} from "@prisma/client";
import { cache } from "react";

async function getScrimFn(id: number) {
  return await prisma.scrim.findFirst({ where: { id } });
}

export const getScrim = cache(getScrimFn);

async function getUserViewableScrimsFn(id: string) {
  return await prisma.scrim.findMany({
    where: { OR: [{ creatorId: id }, { Team: { users: { some: { id } } } }] },
  });
}

/**
 * Returns the scrims that a user is allowed to view.
 *
 * @param id The ID of the user.
 * @returns The scrims that the user is allowed to view.
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
    await prisma.$queryRaw<PlayerStat[]>`
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
 * @param id The ID of the map.
 * @returns The statistics for the final round of the specified map.
 */
export const getFinalRoundStats = cache(getFinalRoundStatsFn);

async function getFinalRoundStatsForPlayerFn(id: number, playerName: string) {
  return removeDuplicateRows(
    await prisma.$queryRaw<PlayerStat[]>`
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
 * @param id The ID of the map.
 * @param playerName The name of the player.
 * @returns The statistics for the final round of the specified map for the specified player.
 */
export const getPlayerFinalStats = cache(getFinalRoundStatsForPlayerFn);

async function getAllStatsForPlayerFn(scrimIds: number[], name: string) {
  if (scrimIds.length === 0) return [];

  const mapDataIds = await prisma.scrim.findMany({
    where: { id: { in: scrimIds } },
    select: { maps: true },
  });

  const mapDataIdSet = new Set<number>();
  mapDataIds.forEach((scrim) => {
    scrim.maps.forEach((map) => {
      mapDataIdSet.add(map.id);
    });
  });

  const mapDataIdArray = Array.from(mapDataIdSet);

  return removeDuplicateRows(
    await prisma.$queryRaw<PlayerStat[]>`
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
 * @param scrimIds The IDs of the scrims the player participated in.
 * @param playerName The name of the player.
 * @returns The statistics for the specified player.
 */
export const getAllStatsForPlayer = cache(getAllStatsForPlayerFn);

async function getAllKillsForPlayerFn(scrimIds: number[], name: string) {
  const mapDataIds = await prisma.scrim.findMany({
    where: { id: { in: scrimIds } },
    select: { maps: true },
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
      MapDataId: { in: mapDataIdArray },
      attacker_name: { equals: name, mode: "insensitive" },
    },
  });
}

/**
 * Returns all of the kills for a specific player.
 * This function is cached for performance.
 *
 * @param scrimIds The IDs of the scrims the player participated in.
 * @param playerName The name of the player.
 * @returns The kills for the specified player.
 */
export const getAllKillsForPlayer = cache(getAllKillsForPlayerFn);

async function getAllDeathsForPlayerFn(scrimIds: number[], name: string) {
  const mapDataIds = await prisma.scrim.findMany({
    where: { id: { in: scrimIds } },
    select: { maps: true },
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
      MapDataId: { in: mapDataIdArray },
      victim_name: { equals: name, mode: "insensitive" },
    },
  });
}

/**
 * Returns all of the deaths for a specific player.
 * This function is cached for performance.
 *
 * @param scrimIds The IDs of the scrims the player participated in.
 * @param playerName The name of the player.
 * @returns The deaths for the specified player.
 */
export const getAllDeathsForPlayer = cache(getAllDeathsForPlayerFn);

export type Winrate = { map: string; wins: number; date: Date }[];

async function getAllMapWinratesForPlayerFn(scrimIds: number[], name: string) {
  const mapDataIds = await prisma.scrim.findMany({
    where: { id: { in: scrimIds } },
    select: { maps: true, date: true, id: true },
  });

  const mapDataIdSet = new Set<number>();
  const mapIdToDateMap = new Map<number, Date>();
  mapDataIds.forEach((scrim) => {
    scrim.maps.forEach((map) => {
      mapDataIdSet.add(map.id);
      mapIdToDateMap.set(map.id, scrim.date);
    });
  });
  const mapDataIdArray = Array.from(mapDataIdSet);

  const [matchStarts, allFinalRounds, captures, playerStats] =
    await Promise.all([
      prisma.matchStart.findMany({
        where: { MapDataId: { in: mapDataIdArray } },
      }),
      prisma.roundEnd.findMany({
        where: { MapDataId: { in: mapDataIdArray } },
      }),
      prisma.objectiveCaptured.findMany({
        where: { MapDataId: { in: mapDataIdArray } },
      }),
      prisma.playerStat.findMany({
        where: {
          player_name: { equals: name, mode: "insensitive" },
          MapDataId: { in: mapDataIdArray },
        },
      }),
    ]);

  const finalRounds = allFinalRounds.reduce(
    (acc, round) => {
      if (
        !acc[round.MapDataId!] ||
        acc[round.MapDataId!].match_time < round.match_time
      ) {
        acc[round.MapDataId!] = round;
      }
      return acc;
    },
    {} as Record<number, RoundEnd>
  );

  const team1CapturesMap = new Map<number, ObjectiveCaptured[]>();
  const team2CapturesMap = new Map<number, ObjectiveCaptured[]>();
  captures.forEach((capture) => {
    const match = matchStarts.find(
      (match) => match.MapDataId === capture.MapDataId
    );
    if (match) {
      if (capture.capturing_team === match.team_1_name) {
        if (!team1CapturesMap.has(capture.MapDataId!)) {
          team1CapturesMap.set(capture.MapDataId!, []);
        }
        team1CapturesMap.get(capture.MapDataId!)!.push(capture);
      } else if (capture.capturing_team === match.team_2_name) {
        if (!team2CapturesMap.has(capture.MapDataId!)) {
          team2CapturesMap.set(capture.MapDataId!, []);
        }
        team2CapturesMap.get(capture.MapDataId!)!.push(capture);
      }
    }
  });

  const wins: { map: string; wins: number; date: Date }[] = [];

  for (const mapId of mapDataIdArray) {
    const playerStat = playerStats.find((stat) => stat.MapDataId === mapId);
    if (!playerStat) continue;

    const matchDetails: MatchStart =
      matchStarts.find((match) => match.MapDataId === mapId) ??
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      ({} as MatchStart);

    const winner = calculateWinner({
      matchDetails,
      finalRound: finalRounds[mapId],
      team1Captures: team1CapturesMap.get(mapId) ?? [],
      team2Captures: team2CapturesMap.get(mapId) ?? [],
    });

    const playerTeam = playerStat?.player_team;

    wins.push({
      map: matchDetails.map_name,
      wins: winner === playerTeam ? 1 : 0,
      date: mapIdToDateMap.get(mapId) ?? new Date(),
    });
  }

  return wins;
}

/**
 * Returns the winrates for a specific player on each map.
 * This function is cached for performance.
 *
 * @param scrimIds The IDs of the scrims the player participated in.
 * @param playerName The name of the player.
 * @returns The winrates for the specified player on each map.
 */
export const getAllMapWinratesForPlayer = cache(getAllMapWinratesForPlayerFn);
