import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { TeamStatsService } from "@/data/team";
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
    route: "/api/bot/team",
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
    const teamIdParam = searchParams.get("teamId");

    if (!teamIdParam) {
      wideEvent.outcome = "bad_request";
      wideEvent.status_code = 400;
      return Response.json(
        { success: false, error: "teamId query parameter is required" },
        { status: 400 }
      );
    }

    const teamId = parseInt(teamIdParam, 10);
    wideEvent.requested_team_id = teamId;

    const hasAccess = await verifyTeamAccess(user.id, teamId);
    wideEvent.access_granted = hasAccess;

    if (!hasAccess) {
      wideEvent.outcome = "forbidden";
      wideEvent.status_code = 403;
      return Response.json(
        { success: false, error: "You don't have access to this team" },
        { status: 403 }
      );
    }

    const [team, winrates] = await Promise.all([
      prisma.team.findUnique({
        where: { id: teamId },
        select: {
          name: true,
          _count: { select: { users: true } },
        },
      }),
      AppRuntime.runPromise(
        TeamStatsService.pipe(
          Effect.flatMap((svc) => svc.getTeamWinrates(teamId))
        )
      ),
    ]);

    if (!team) {
      wideEvent.outcome = "not_found";
      wideEvent.status_code = 404;
      return Response.json(
        { success: false, error: "Team not found" },
        { status: 404 }
      );
    }

    wideEvent.winrate_count = Object.keys(winrates.byMap).length;
    wideEvent.outcome = "success";
    wideEvent.status_code = 200;

    const span = trace.getActiveSpan();
    if (span) {
      span.setAttributes({
        "bot.team.team_id": teamId,
        "bot.team.team_name": team.name,
        "bot.team.member_count": team._count.users,
        "bot.team.overall_wins": winrates.overallWins,
        "bot.team.overall_losses": winrates.overallLosses,
        "bot.team.overall_winrate": winrates.overallWinrate,
        "bot.team.map_count": Object.keys(winrates.byMap).length,
        "bot.team.by_map": JSON.stringify(winrates.byMap),
      });
    }

    return Response.json({
      success: true,
      data: {
        team: {
          name: team.name,
          memberCount: team._count.users,
        },
        winrates,
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
