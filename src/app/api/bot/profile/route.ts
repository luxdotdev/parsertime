import {
  getAvailableMapsForComparison,
  getComparisonStats,
} from "@/data/comparison-dto";
import {
  authenticateBotSecret,
  resolveDiscordUser,
  verifyTeamAccess,
} from "@/lib/bot-auth";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
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
    const playerName = searchParams.get("playerName");
    const teamIdParam = searchParams.get("teamId");

    if (!playerName) {
      wideEvent.outcome = "bad_request";
      wideEvent.status_code = 400;
      return Response.json(
        { success: false, error: "playerName query parameter is required" },
        { status: 400 }
      );
    }
    wideEvent.player_name = playerName;

    let teamId: number;
    if (teamIdParam) {
      teamId = parseInt(teamIdParam, 10);
    } else {
      // Use the user's first team
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

    const availableMaps = await getAvailableMapsForComparison({
      teamId,
      playerName,
    });

    if (availableMaps.length === 0) {
      wideEvent.outcome = "no_data";
      wideEvent.status_code = 404;
      return Response.json(
        {
          success: false,
          error: `No data found for player "${playerName}" on this team`,
        },
        { status: 404 }
      );
    }

    const mapIds = availableMaps.map((m) => m.id);
    const stats = await getComparisonStats(mapIds, playerName);

    const heroesPlayed = Array.from(
      new Set(availableMaps.flatMap((m) => m.playerHeroes))
    );

    wideEvent.map_count = availableMaps.length;
    wideEvent.heroes_played = heroesPlayed.length;
    wideEvent.outcome = "success";
    wideEvent.status_code = 200;

    const responseData = {
      playerName: stats.playerName,
      teamId,
      mapCount: stats.mapCount,
      heroesPlayed,
      aggregated: stats.aggregated,
      trends: stats.trends,
    };

    // Annotate the active span with response data for debugging
    const span = trace.getActiveSpan();
    if (span) {
      span.setAttributes({
        "bot.profile.player_name": stats.playerName,
        "bot.profile.team_id": teamId,
        "bot.profile.map_count": stats.mapCount,
        "bot.profile.heroes_played": heroesPlayed.join(", "),
        "bot.profile.available_maps_count": availableMaps.length,
        "bot.profile.map_ids": JSON.stringify(mapIds),
        "bot.profile.aggregated": JSON.stringify(stats.aggregated),
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
