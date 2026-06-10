#!/usr/bin/env bun

import prisma from "@/lib/prisma";
import { getUltQualityStatsForMapData } from "@/lib/ult-quality-db";
import { ULT_STAT_TYPES } from "@/lib/ult-quality";
import { heroRoleMapping, type HeroName } from "@/types/heroes";
import type { CalculatedStatType, Role } from "@prisma/client";

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
    const stats = await getUltQualityStatsForMapData(mapDataId, player_name);

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
      ["AVERAGE_ULT_CONVERSION_KILLS", stats.averageUltConversionKills],
      ["ULT_DEATH_PERCENTAGE", stats.ultDeathPercentage],
      ["AVERAGE_ULT_DISPLACEMENT", stats.averageUltDisplacement],
      ["ULTS_ON_OBJECTIVE_PERCENTAGE", stats.ultsOnObjectivePercentage],
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
  // Only maps that actually have ultimateStart rows are worth processing.
  const ultMaps = await prisma.ultimateStart.findMany({
    where: { MapDataId: { not: null } },
    select: { MapDataId: true, scrimId: true },
    distinct: ["MapDataId"],
  });

  console.log(`Found ${ultMaps.length} maps with ultimate data`);

  let processed = 0;
  let skipped = 0;
  let failed = 0;

  for (const { MapDataId, scrimId } of ultMaps) {
    const mapDataId = MapDataId!;

    // CalculatedStat has NO unique constraint, so skipDuplicates does not
    // dedupe — this existence check is the idempotency guard.
    const existing = await prisma.calculatedStat.count({
      where: {
        MapDataId: mapDataId,
        stat: { in: [...ULT_STAT_TYPES] as CalculatedStatType[] },
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
