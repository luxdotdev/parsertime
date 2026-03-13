import { aggregatePlayerStats, calculateTrends } from "@/data/comparison-dto";
import { removeDuplicateRows } from "@/lib/utils";
import { authenticateBotSecret } from "@/lib/bot-auth";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { Prisma, type PlayerStat } from "@prisma/client";
import { trace } from "@opentelemetry/api";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const wideEvent: Record<string, unknown> = {
    route: "/api/bot/profile",
    method: "GET",
    timestamp: new Date().toISOString(),
  };
  const startTime = Date.now();

  try {
    if (!authenticateBotSecret(request)) {
      wideEvent.outcome = "unauthorized";
      wideEvent.status_code = 401;
      return Response.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const playerName = searchParams.get("playerName");

    if (!playerName) {
      wideEvent.outcome = "bad_request";
      wideEvent.status_code = 400;
      return Response.json(
        { success: false, error: "playerName query parameter is required" },
        { status: 400 }
      );
    }
    wideEvent.player_name = playerName;

    // Find all scrims the player participated in (globally, no team restriction)
    const playerScrims = await prisma.playerStat.findMany({
      where: { player_name: { equals: playerName, mode: "insensitive" } },
      select: { scrimId: true },
      distinct: ["scrimId"],
    });

    const scrimIds = playerScrims.map((s) => s.scrimId);

    if (scrimIds.length === 0) {
      wideEvent.outcome = "no_data";
      wideEvent.status_code = 404;
      return Response.json(
        {
          success: false,
          error: `No data found for player "${playerName}"`,
        },
        { status: 404 }
      );
    }

    // Get all MapData IDs from those scrims
    const scrims = await prisma.scrim.findMany({
      where: { id: { in: scrimIds } },
      select: {
        maps: {
          select: {
            mapData: { select: { id: true } },
          },
        },
      },
    });

    const mapDataIds = scrims.flatMap((s) =>
      s.maps.flatMap((m) => m.mapData.map((md) => md.id))
    );

    // Get final-round stats for this player across all their maps
    const finalRoundStats = removeDuplicateRows(
      await prisma.$queryRaw<PlayerStat[]>`
        WITH maxTime AS (
          SELECT
              MAX("match_time") AS max_time,
              "MapDataId"
          FROM
              "PlayerStat"
          WHERE
              "MapDataId" IN (${Prisma.join(mapDataIds)})
          GROUP BY
              "MapDataId"
        )
        SELECT
            ps.*
        FROM
            "PlayerStat" ps
            INNER JOIN maxTime m ON ps."match_time" = m.max_time AND ps."MapDataId" = m."MapDataId"
        WHERE
            ps."MapDataId" IN (${Prisma.join(mapDataIds)})
            AND ps."player_name" ILIKE ${playerName}
      `
    );

    const calculatedStats = await prisma.calculatedStat.findMany({
      where: {
        MapDataId: { in: mapDataIds },
        playerName: { equals: playerName, mode: "insensitive" },
      },
    });

    // Group stats per map for trends
    const statsByMapDataId: Record<number, PlayerStat[]> = {};
    for (const stat of finalRoundStats) {
      if (!stat.MapDataId) continue;
      if (!statsByMapDataId[stat.MapDataId]) {
        statsByMapDataId[stat.MapDataId] = [];
      }
      statsByMapDataId[stat.MapDataId].push(stat);
    }

    const calcStatsByMapDataId: Record<number, typeof calculatedStats> = {};
    for (const stat of calculatedStats) {
      if (!calcStatsByMapDataId[stat.MapDataId]) {
        calcStatsByMapDataId[stat.MapDataId] = [];
      }
      calcStatsByMapDataId[stat.MapDataId].push(stat);
    }

    const perMapPlayerStats = Object.values(statsByMapDataId).map(
      (stats) => stats[0]
    );
    const perMapCalcStats = Object.keys(statsByMapDataId).map(
      (mdId) => calcStatsByMapDataId[Number(mdId)] || []
    );

    const mapCount = Object.keys(statsByMapDataId).length;
    const heroesPlayed = Array.from(
      new Set(finalRoundStats.map((s) => s.player_hero))
    );

    const aggregated = aggregatePlayerStats(
      finalRoundStats,
      calculatedStats,
      perMapPlayerStats,
      perMapCalcStats
    );
    const trends = calculateTrends(perMapPlayerStats, perMapCalcStats);

    wideEvent.map_count = mapCount;
    wideEvent.heroes_played = heroesPlayed.length;
    wideEvent.outcome = "success";
    wideEvent.status_code = 200;

    const responseData = {
      playerName,
      mapCount,
      heroesPlayed,
      aggregated,
      trends,
    };

    const span = trace.getActiveSpan();
    if (span) {
      span.setAttributes({
        "bot.profile.player_name": playerName,
        "bot.profile.map_count": mapCount,
        "bot.profile.heroes_played": heroesPlayed.join(", "),
        "bot.profile.scrim_count": scrimIds.length,
        "bot.profile.map_data_ids_count": mapDataIds.length,
        "bot.profile.final_round_stats_count": finalRoundStats.length,
        "bot.profile.aggregated": JSON.stringify(aggregated),
      });
    }

    return Response.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    wideEvent.outcome = "error";
    wideEvent.status_code = 500;
    wideEvent.error = {
      message: (error as Error).message,
      type: (error as Error).name,
    };
    return Response.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    wideEvent.duration_ms = Date.now() - startTime;
    Logger.info(wideEvent);
  }
}
