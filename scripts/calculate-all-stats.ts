#!/usr/bin/env bun

import { calculateStats } from "@/lib/calculate-stats";
import prisma from "@/lib/prisma";
import { type CalculatedStatType, type Role } from "@prisma/client";

async function getUniquePlayersForMap(mapDataId: number): Promise<string[]> {
  const players = await prisma.playerStat.findMany({
    where: { MapDataId: mapDataId },
    select: { player_name: true },
    distinct: ["player_name"],
  });

  return players.map((p) => p.player_name);
}

async function processMap(mapDataId: number, scrimId: number) {
  console.log(`\nProcessing MapData ID: ${mapDataId}, Scrim ID: ${scrimId}`);

  try {
    const players = await getUniquePlayersForMap(mapDataId);
    console.log(`  Found ${players.length} unique players`);

    let successCount = 0;
    let errorCount = 0;

    for (const playerName of players) {
      try {
        const stats = await calculateStats(mapDataId, playerName);

        const calculatedStatRecords: Array<{
          scrimId: number;
          playerName: string;
          hero: string;
          role: Role;
          stat: CalculatedStatType;
          value: number;
          MapDataId: number;
        }> = [];

        if (
          stats.fletaDeadliftPercentage !== null &&
          !isNaN(stats.fletaDeadliftPercentage)
        ) {
          calculatedStatRecords.push({
            scrimId,
            playerName: stats.playerName,
            hero: stats.hero,
            role: stats.role as Role,
            stat: "FLETA_DEADLIFT_PERCENTAGE",
            value: stats.fletaDeadliftPercentage,
            MapDataId: mapDataId,
          });
        }

        if (
          stats.firstPickPercentage !== null &&
          !isNaN(stats.firstPickPercentage)
        ) {
          calculatedStatRecords.push({
            scrimId,
            playerName: stats.playerName,
            hero: stats.hero,
            role: stats.role as Role,
            stat: "FIRST_PICK_PERCENTAGE",
            value: stats.firstPickPercentage,
            MapDataId: mapDataId,
          });
        }

        if (stats.firstPickCount !== null && !isNaN(stats.firstPickCount)) {
          calculatedStatRecords.push({
            scrimId,
            playerName: stats.playerName,
            hero: stats.hero,
            role: stats.role as Role,
            stat: "FIRST_PICK_COUNT",
            value: stats.firstPickCount,
            MapDataId: mapDataId,
          });
        }

        if (
          stats.firstDeathPercentage !== null &&
          !isNaN(stats.firstDeathPercentage)
        ) {
          calculatedStatRecords.push({
            scrimId,
            playerName: stats.playerName,
            hero: stats.hero,
            role: stats.role as Role,
            stat: "FIRST_DEATH_PERCENTAGE",
            value: stats.firstDeathPercentage,
            MapDataId: mapDataId,
          });
        }

        if (stats.firstDeathCount !== null && !isNaN(stats.firstDeathCount)) {
          calculatedStatRecords.push({
            scrimId,
            playerName: stats.playerName,
            hero: stats.hero,
            role: stats.role as Role,
            stat: "FIRST_DEATH_COUNT",
            value: stats.firstDeathCount,
            MapDataId: mapDataId,
          });
        }

        if (
          stats.mvpScore !== null &&
          stats.mvpScore !== undefined &&
          !isNaN(stats.mvpScore)
        ) {
          calculatedStatRecords.push({
            scrimId,
            playerName: stats.playerName,
            hero: stats.hero,
            role: stats.role as Role,
            stat: "MVP_SCORE",
            value: stats.mvpScore,
            MapDataId: mapDataId,
          });
        }

        if (stats.isMapMVP) {
          calculatedStatRecords.push({
            scrimId,
            playerName: stats.playerName,
            hero: stats.hero,
            role: stats.role as Role,
            stat: "MAP_MVP_COUNT",
            value: 1,
            MapDataId: mapDataId,
          });
        }

        if (stats.ajaxCount !== null && !isNaN(stats.ajaxCount)) {
          calculatedStatRecords.push({
            scrimId,
            playerName: stats.playerName,
            hero: stats.hero,
            role: stats.role as Role,
            stat: "AJAX_COUNT",
            value: stats.ajaxCount,
            MapDataId: mapDataId,
          });
        }

        if (
          stats.averageUltChargeTime !== null &&
          !isNaN(stats.averageUltChargeTime)
        ) {
          calculatedStatRecords.push({
            scrimId,
            playerName: stats.playerName,
            hero: stats.hero,
            role: stats.role as Role,
            stat: "AVERAGE_ULT_CHARGE_TIME",
            value: stats.averageUltChargeTime,
            MapDataId: mapDataId,
          });
        }

        if (
          stats.averageTimeToUseUlt !== null &&
          !isNaN(stats.averageTimeToUseUlt)
        ) {
          calculatedStatRecords.push({
            scrimId,
            playerName: stats.playerName,
            hero: stats.hero,
            role: stats.role as Role,
            stat: "AVERAGE_TIME_TO_USE_ULT",
            value: stats.averageTimeToUseUlt,
            MapDataId: mapDataId,
          });
        }

        if (stats.droughtTime !== null && !isNaN(stats.droughtTime)) {
          calculatedStatRecords.push({
            scrimId,
            playerName: stats.playerName,
            hero: stats.hero,
            role: stats.role as Role,
            stat: "AVERAGE_DROUGHT_TIME",
            value: stats.droughtTime,
            MapDataId: mapDataId,
          });
        }

        if (stats.killsPerUltimate !== null && !isNaN(stats.killsPerUltimate)) {
          calculatedStatRecords.push({
            scrimId,
            playerName: stats.playerName,
            hero: stats.hero,
            role: stats.role as Role,
            stat: "KILLS_PER_ULTIMATE",
            value: stats.killsPerUltimate,
            MapDataId: mapDataId,
          });
        }

        if (
          stats.duels &&
          typeof stats.duels === "object" &&
          "winrate" in stats.duels
        ) {
          const duelWinrate = (stats.duels as { winrate: number }).winrate;
          if (duelWinrate !== null && !isNaN(duelWinrate)) {
            calculatedStatRecords.push({
              scrimId,
              playerName: stats.playerName,
              hero: stats.hero,
              role: stats.role as Role,
              stat: "DUEL_WINRATE_PERCENTAGE",
              value: duelWinrate,
              MapDataId: mapDataId,
            });
          }
        }

        if (
          stats.fightReversalPercentage !== null &&
          !isNaN(stats.fightReversalPercentage)
        ) {
          calculatedStatRecords.push({
            scrimId,
            playerName: stats.playerName,
            hero: stats.hero,
            role: stats.role as Role,
            stat: "FIGHT_REVERSAL_PERCENTAGE",
            value: stats.fightReversalPercentage,
            MapDataId: mapDataId,
          });
        }

        if (calculatedStatRecords.length > 0) {
          await prisma.calculatedStat.createMany({
            data: calculatedStatRecords,
            skipDuplicates: true,
          });
          console.log(
            `    ✓ Processed ${playerName}: ${calculatedStatRecords.length} stats saved`
          );
          successCount++;
        } else {
          console.log(`    ⚠ Processed ${playerName}: No valid stats to save`);
        }
      } catch (error) {
        errorCount++;
        console.error(
          `    ✗ Error processing player ${playerName}:`,
          error instanceof Error ? error.message : String(error)
        );
      }
    }

    console.log(`  Summary: ${successCount} succeeded, ${errorCount} failed`);
    return { successCount, errorCount };
  } catch (error) {
    console.error(
      `  ✗ Error processing map ${mapDataId}:`,
      error instanceof Error ? error.message : String(error)
    );
    return { successCount: 0, errorCount: 1 };
  }
}

async function main() {
  console.log("Starting calculation of stats for all maps...\n");

  try {
    const mapDataRecords = await prisma.mapData.findMany({
      select: {
        id: true,
        scrimId: true,
      },
      where: {
        mapId: {
          not: null,
        },
      },
      orderBy: {
        id: "asc",
      },
      skip: 10,
    });

    console.log(`Found ${mapDataRecords.length} MapData records to process\n`);

    let totalSuccess = 0;
    let totalErrors = 0;
    let mapsProcessed = 0;

    for (const mapData of mapDataRecords) {
      const result = await processMap(mapData.id, mapData.scrimId);
      totalSuccess += result.successCount;
      totalErrors += result.errorCount;
      mapsProcessed++;

      if (mapsProcessed % 10 === 0) {
        console.log(
          `\n--- Progress: ${mapsProcessed}/${mapDataRecords.length} maps processed ---\n`
        );
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log("FINAL SUMMARY");
    console.log("=".repeat(50));
    console.log(`Total maps processed: ${mapsProcessed}`);
    console.log(`Total players succeeded: ${totalSuccess}`);
    console.log(`Total errors: ${totalErrors}`);
    console.log("=".repeat(50));
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
