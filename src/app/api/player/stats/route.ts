import {
  getAllDeathsForPlayer,
  getAllKillsForPlayer,
  getAllMapWinratesForPlayer,
  getAllStatsForPlayer,
} from "@/data/scrim-dto";
import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import { Logger } from "@/lib/logger";
import { Permission } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

const PlayerNameSchema = z.string().min(1);

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const user = await getUser(session.user.email);
  if (!user) {
    return new Response("User not found", { status: 404 });
  }

  const playerName = request.nextUrl.searchParams.get("playerName");
  if (!playerName) {
    return new Response("Player name is required", { status: 400 });
  }

  const validPlayerName = PlayerNameSchema.safeParse(playerName);
  if (!validPlayerName.success) {
    return new Response("Invalid player name", { status: 400 });
  }

  const name = decodeURIComponent(validPlayerName.data);

  const [timeframe1, timeframe2, timeframe3] = await Promise.all([
    new Permission("stats-timeframe-1").check(),
    new Permission("stats-timeframe-2").check(),
    new Permission("stats-timeframe-3").check(),
  ]);

  const playerScrims = await prisma.playerStat.findMany({
    where: { player_name: { equals: name, mode: "insensitive" } },
    select: { scrimId: true },
    distinct: ["scrimId"],
  });

  const scrimIds = playerScrims.map((scrim) => scrim.scrimId);

  const allScrims = await prisma.scrim.findMany({
    where: { id: { in: scrimIds } },
  });

  const week = new Date();
  week.setDate(week.getDate() - 7);
  const oneWeekScrims = allScrims.filter((scrim) => scrim.date >= week);

  const twoWeeks = new Date();
  twoWeeks.setDate(twoWeeks.getDate() - 14);
  const twoWeeksScrims = allScrims.filter((scrim) => scrim.date >= twoWeeks);

  const month = new Date();
  month.setMonth(month.getMonth() - 1);
  const monthScrims = allScrims.filter((scrim) => scrim.date >= month);

  const threeMonths = new Date();
  threeMonths.setMonth(threeMonths.getMonth() - 3);
  const threeMonthsScrims = allScrims.filter(
    (scrim) => scrim.date >= threeMonths
  );

  const sixMonths = new Date();
  sixMonths.setMonth(sixMonths.getMonth() - 6);
  const sixMonthsScrims = allScrims.filter((scrim) => scrim.date >= sixMonths);

  const year = new Date();
  year.setFullYear(year.getFullYear() - 1);
  const yearScrims = allScrims.filter((scrim) => scrim.date >= year);

  const data = {
    "one-week": oneWeekScrims,
    "two-weeks": twoWeeksScrims,
    "one-month": monthScrims,
    "three-months": threeMonthsScrims,
    "six-months": sixMonthsScrims,
    "one-year": yearScrims,
    "all-time": allScrims,
    custom: [],
  };

  const permitted = timeframe3
    ? "all-time"
    : timeframe2
      ? "six-months"
      : "one-month";

  const permittedScrimIds = data[permitted].map((scrim) => scrim.id);

  try {
    const [allPlayerStats, allPlayerKills, mapWinrates, allPlayerDeaths] =
      await Promise.all([
        getAllStatsForPlayer(permittedScrimIds, name),
        getAllKillsForPlayer(permittedScrimIds, name),
        getAllMapWinratesForPlayer(permittedScrimIds, name),
        getAllDeathsForPlayer(permittedScrimIds, name),
      ]);

    return NextResponse.json({
      success: true,
      data: {
        playerName: name,
        scrims: data,
        stats: allPlayerStats,
        kills: allPlayerKills,
        mapWinrates,
        deaths: allPlayerDeaths,
        permissions: {
          "stats-timeframe-1": timeframe1,
          "stats-timeframe-2": timeframe2,
          "stats-timeframe-3": timeframe3,
        },
      },
    });
  } catch (error) {
    Logger.error("Error fetching player stats", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch player statistics",
      },
      { status: 500 }
    );
  }
}
