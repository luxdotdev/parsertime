import { aggregatePlayerStats } from "@/data/comparison-dto";
import { authenticateBotSecret } from "@/lib/bot-auth";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { removeDuplicateRows } from "@/lib/utils";
import { trace } from "@opentelemetry/api";
import { Prisma, type PlayerStat } from "@prisma/client";
import type { NextRequest } from "next/server";

async function getPlayerStats(playerName: string) {
  const playerScrims = await prisma.playerStat.findMany({
    where: { player_name: { equals: playerName, mode: "insensitive" } },
    select: { scrimId: true },
    distinct: ["scrimId"],
  });

  const scrimIds = playerScrims.map((s) => s.scrimId);
  if (scrimIds.length === 0) return null;

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

  if (mapDataIds.length === 0) return null;

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

  const mapCount = new Set(finalRoundStats.map((s) => s.MapDataId)).size;
  const aggregated = aggregatePlayerStats(finalRoundStats, calculatedStats);

  return { playerName, mapCount, aggregated };
}

export async function GET(request: NextRequest) {
  const wideEvent: Record<string, unknown> = {
    route: "/api/bot/compare",
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
    const player1 = searchParams.get("player1");
    const player2 = searchParams.get("player2");

    if (!player1 || !player2) {
      wideEvent.outcome = "bad_request";
      wideEvent.status_code = 400;
      return Response.json(
        {
          success: false,
          error: "player1 and player2 query parameters are required",
        },
        { status: 400 }
      );
    }
    wideEvent.player1 = player1;
    wideEvent.player2 = player2;

    const [stats1, stats2] = await Promise.all([
      getPlayerStats(player1),
      getPlayerStats(player2),
    ]);

    if (!stats1) {
      wideEvent.outcome = "no_data";
      wideEvent.status_code = 404;
      return Response.json(
        {
          success: false,
          error: `No data found for player "${player1}"`,
        },
        { status: 404 }
      );
    }

    if (!stats2) {
      wideEvent.outcome = "no_data";
      wideEvent.status_code = 404;
      return Response.json(
        {
          success: false,
          error: `No data found for player "${player2}"`,
        },
        { status: 404 }
      );
    }

    wideEvent.map_count_p1 = stats1.mapCount;
    wideEvent.map_count_p2 = stats2.mapCount;
    wideEvent.outcome = "success";
    wideEvent.status_code = 200;

    const span = trace.getActiveSpan();
    if (span) {
      span.setAttributes({
        "bot.compare.player1_name": stats1.playerName,
        "bot.compare.player1_map_count": stats1.mapCount,
        "bot.compare.player1_aggregated": JSON.stringify(stats1.aggregated),
        "bot.compare.player2_name": stats2.playerName,
        "bot.compare.player2_map_count": stats2.mapCount,
        "bot.compare.player2_aggregated": JSON.stringify(stats2.aggregated),
      });
    }

    return Response.json({
      success: true,
      data: {
        player1: {
          playerName: stats1.playerName,
          mapCount: stats1.mapCount,
          aggregated: stats1.aggregated,
        },
        player2: {
          playerName: stats2.playerName,
          mapCount: stats2.mapCount,
          aggregated: stats2.aggregated,
        },
      },
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
