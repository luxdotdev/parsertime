import {
  getAvailableMapsForComparison,
  getComparisonStats,
} from "@/data/comparison-dto";
import {
  authenticateBotRequest,
  resolveDiscordUser,
  verifyTeamAccess,
} from "@/lib/bot-auth";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const wideEvent: Record<string, unknown> = {
    route: "/api/bot/compare",
    method: "GET",
    timestamp: new Date().toISOString(),
  };
  const startTime = Date.now();

  try {
    const botAuth = await authenticateBotRequest(request);
    if (!botAuth) {
      wideEvent.outcome = "unauthorized";
      wideEvent.status_code = 401;
      return Response.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    wideEvent.bot_key_id = botAuth.keyId;
    wideEvent.guild_id = botAuth.guildId;

    const discordId = request.headers.get("X-Discord-User-Id");
    if (!discordId) {
      wideEvent.outcome = "bad_request";
      wideEvent.status_code = 400;
      return Response.json(
        { success: false, error: "X-Discord-User-Id header is required" },
        { status: 400 }
      );
    }
    wideEvent.discord_id = discordId;

    const user = await resolveDiscordUser(discordId);
    wideEvent.user_id = user?.id;
    wideEvent.user_linked = !!user;

    if (!user) {
      wideEvent.outcome = "not_linked";
      wideEvent.status_code = 403;
      return Response.json(
        {
          success: false,
          error:
            "Link your Discord account at parsertime.app/settings to use this command",
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const player1 = searchParams.get("player1");
    const player2 = searchParams.get("player2");
    const teamIdParam = searchParams.get("teamId");

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

    let teamId: number;
    if (teamIdParam) {
      teamId = parseInt(teamIdParam, 10);
    } else {
      const userWithTeams = await prisma.user.findUnique({
        where: { id: user.id },
        select: { teams: { select: { id: true }, take: 1 } },
      });
      const firstTeam = userWithTeams?.teams[0];
      if (!firstTeam) {
        wideEvent.outcome = "no_team";
        wideEvent.status_code = 404;
        return Response.json(
          { success: false, error: "You are not a member of any team" },
          { status: 404 }
        );
      }
      teamId = firstTeam.id;
    }

    const hasAccess = await verifyTeamAccess(user.id, teamId);
    if (!hasAccess) {
      wideEvent.outcome = "forbidden";
      wideEvent.status_code = 403;
      return Response.json(
        { success: false, error: "You don't have access to this team" },
        { status: 403 }
      );
    }

    const [maps1, maps2] = await Promise.all([
      getAvailableMapsForComparison({ teamId, playerName: player1 }),
      getAvailableMapsForComparison({ teamId, playerName: player2 }),
    ]);

    if (maps1.length === 0) {
      wideEvent.outcome = "no_data";
      wideEvent.status_code = 404;
      return Response.json(
        {
          success: false,
          error: `No data found for player "${player1}" on this team`,
        },
        { status: 404 }
      );
    }

    if (maps2.length === 0) {
      wideEvent.outcome = "no_data";
      wideEvent.status_code = 404;
      return Response.json(
        {
          success: false,
          error: `No data found for player "${player2}" on this team`,
        },
        { status: 404 }
      );
    }

    const [stats1, stats2] = await Promise.all([
      getComparisonStats(
        maps1.map((m) => m.id),
        player1
      ),
      getComparisonStats(
        maps2.map((m) => m.id),
        player2
      ),
    ]);

    wideEvent.map_count_p1 = stats1.mapCount;
    wideEvent.map_count_p2 = stats2.mapCount;
    wideEvent.outcome = "success";
    wideEvent.status_code = 200;

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
