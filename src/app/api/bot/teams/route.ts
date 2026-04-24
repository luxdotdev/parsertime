import {
  authenticateBotSecret,
  resolveDiscordUser,
} from "@/lib/bot-auth";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import type { NextRequest } from "next/server";

type TeamListEntry = {
  id: number;
  name: string;
  role: "owner" | "manager" | "member";
};

export async function GET(request: NextRequest) {
  const wideEvent: Record<string, unknown> = {
    route: "/api/bot/teams",
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
    wideEvent.user_linked = Boolean(user);

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

    const teams = await prisma.team.findMany({
      where: {
        id: { not: 0 },
        OR: [
          { ownerId: user.id },
          { users: { some: { id: user.id } } },
          { managers: { some: { userId: user.id } } },
        ],
      },
      orderBy: { id: "asc" },
      select: {
        id: true,
        name: true,
        ownerId: true,
        managers: {
          where: { userId: user.id },
          select: { id: true },
        },
      },
    });

    const entries: TeamListEntry[] = teams.map((t) => ({
      id: t.id,
      name: t.name,
      role:
        t.ownerId === user.id
          ? "owner"
          : t.managers.length > 0
            ? "manager"
            : "member",
    }));

    wideEvent.team_count = entries.length;
    wideEvent.outcome = "success";
    wideEvent.status_code = 200;

    return Response.json({ success: true, data: { teams: entries } });
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
