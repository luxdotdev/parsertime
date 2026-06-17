#!/usr/bin/env bun

import prisma from "@/lib/prisma";
import {
  getSpatialStatsForMapData,
  SPATIAL_STAT_TYPES,
} from "@/lib/spatial-stats";
import { heroRoleMapping, type HeroName } from "@/types/heroes";
import type { CalculatedStatType, Role } from "@/generated/prisma/client";

async function processMap(mapDataId: number, scrimId: number) {
  const players = await prisma.playerStat.findMany({
    where: { MapDataId: mapDataId },
    select: { player_name: true },
    distinct: ["player_name"],
  });

  const records: Array<{
    scrimId: number;
    playerName: string;
    hero: string;
    role: Role;
    stat: CalculatedStatType;
    value: number;
    MapDataId: number;
  }> = [];

  for (const { player_name } of players) {
    const stats = await getSpatialStatsForMapData(mapDataId, player_name);

    const heroRow = await prisma.playerStat.findFirst({
      where: { MapDataId: mapDataId, player_name },
      orderBy: [{ match_time: "desc" }, { hero_time_played: "desc" }],
      select: { player_hero: true },
    });
    if (!heroRow) continue;

    const hero = heroRow.player_hero;
    const roleName = heroRoleMapping[hero as HeroName];
    if (!roleName) {
      console.warn(`  Unknown hero "${hero}" for ${player_name}, skipping`);
      continue;
    }
    const role = roleName.toUpperCase() as Role;

    const entries: Array<[CalculatedStatType, number | null]> = [
      ["AVERAGE_ENGAGEMENT_DISTANCE", stats.averageEngagementDistance],
      ["HIGH_GROUND_KILL_PERCENTAGE", stats.highGroundKillPercentage],
      ["ISOLATION_DEATH_PERCENTAGE", stats.isolationDeathPercentage],
      ["AVERAGE_FIGHT_START_SPREAD", stats.averageFightStartSpread],
    ];

    for (const [stat, value] of entries) {
      if (value !== null && !Number.isNaN(value)) {
        records.push({
          scrimId,
          playerName: player_name,
          hero,
          role,
          stat,
          value,
          MapDataId: mapDataId,
        });
      }
    }
  }

  if (records.length > 0) {
    await prisma.calculatedStat.createMany({
      data: records,
      skipDuplicates: true,
    });
  }

  return records.length;
}

async function main() {
  // Only maps that actually have coordinate data are worth processing.
  const coordMaps = await prisma.kill.findMany({
    where: { attacker_x: { not: null }, MapDataId: { not: null } },
    select: { MapDataId: true, scrimId: true },
    distinct: ["MapDataId"],
  });

  console.log(`Found ${coordMaps.length} maps with positional data`);

  let processed = 0;
  let skipped = 0;
  let failed = 0;

  for (const { MapDataId, scrimId } of coordMaps) {
    const mapDataId = MapDataId!;

    // CalculatedStat has NO unique constraint, so skipDuplicates does not
    // dedupe — this existence check is the idempotency guard.
    const existing = await prisma.calculatedStat.count({
      where: {
        MapDataId: mapDataId,
        stat: { in: [...SPATIAL_STAT_TYPES] as CalculatedStatType[] },
      },
    });
    if (existing > 0) {
      skipped++;
      continue;
    }

    try {
      const count = await processMap(mapDataId, scrimId);
      processed++;
      console.log(`Processed map ${mapDataId}: ${count} stat rows`);
    } catch (error) {
      failed++;
      console.error(`Failed map ${mapDataId}:`, error);
    }
  }

  console.log(
    `\nDone. ${processed} processed, ${skipped} skipped (already done), ${failed} failed.`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
