import "server-only";

import prisma from "@/lib/prisma";
import { removeDuplicateRows } from "@/lib/utils";
import { Kill, PlayerStat, Prisma } from "@prisma/client";
import { cache } from "react";

async function getAllStatsForHeroFn(scrimIds: number[], hero: string) {
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
          AND ps."player_hero" ILIKE ${hero}`
  );
}

/**
 * Returns all of the statistics for a specific hero.
 * This function is cached for performance.
 *
 * @param {number} scrimIds The IDs of the scrims the hero participated in.
 * @param {string} hero The name of the hero.
 * @returns {PlayerStatRows} The statistics for the specified hero.
 */
export const getAllStatsForHero = cache(getAllStatsForHeroFn);

async function getAllKillsForHeroFn(scrimIds: number[], hero: string) {
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
      attacker_hero: { equals: hero, mode: "insensitive" },
    },
  });
}

/**
 * Returns all of the kills for a specific hero.
 * This function is cached for performance.
 *
 * @param {number} scrimIds The IDs of the scrims the hero participated in.
 * @param {string} playerName The name of the player.
 * @returns {Kill[]} The kills for the specified player.
 */
export const getAllKillsForHero = cache(getAllKillsForHeroFn);

async function getAllDeathsForHeroFn(scrimIds: number[], hero: string) {
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
      victim_hero: { equals: hero, mode: "insensitive" },
    },
  });
}

/**
 * Returns all of the deaths for a specific hero.
 * This function is cached for performance.
 *
 * @param {number} scrimIds The IDs of the scrims the hero participated in.
 * @param {string} hero The name of the hero.
 * @returns {Kill[]} The deaths for the specified hero.
 */
export const getAllDeathsForHero = cache(getAllDeathsForHeroFn);
