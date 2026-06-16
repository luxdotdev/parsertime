import { auth } from "@/lib/auth";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { context, propagation } from "@opentelemetry/api";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  const wideEvent: Record<string, unknown> = {
    route: "/api/bot/guilds/[guildId]/channels",
    method: "GET",
    timestamp: new Date().toISOString(),
    guild_id: guildId,
  };
  const startTime = Date.now();

  try {
    const session = await auth();
    if (!session?.user?.email) {
      wideEvent.outcome = "unauthorized";
      wideEvent.status_code = 401;
      return Response.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const discordAccount = await prisma.account.findFirst({
      where: {
        provider: "discord",
        user: { email: session.user.email },
      },
      select: { providerAccountId: true },
    });

    if (!discordAccount) {
      wideEvent.outcome = "discord_not_linked";
      wideEvent.status_code = 403;
      return Response.json(
        {
          success: false,
          error: "Discord account not linked",
          code: "discord_not_linked",
        },
        { status: 403 }
      );
    }

    const botApiUrl = process.env.BOT_API_URL;
    const botSecret = process.env.BOT_SECRET;

    if (!botApiUrl || !botSecret) {
      wideEvent.outcome = "misconfigured";
      wideEvent.status_code = 503;
      return Response.json(
        { success: false, error: "Bot service not configured" },
        { status: 503 }
      );
    }

    const traceHeaders: Record<string, string> = {};
    propagation.inject(context.active(), traceHeaders);

    const response = await fetch(
      `${botApiUrl}/api/guilds/${encodeURIComponent(guildId)}/channels?userId=${encodeURIComponent(discordAccount.providerAccountId)}`,
      {
        headers: {
          Authorization: `Bearer ${botSecret}`,
          ...traceHeaders,
        },
      }
    );

    if (response.status === 403) {
      wideEvent.outcome = "forbidden";
      wideEvent.status_code = 403;
      return Response.json(
        { success: false, error: "You are not a member of that server" },
        { status: 403 }
      );
    }

    if (!response.ok) {
      wideEvent.outcome = "upstream_error";
      wideEvent.status_code = response.status;
      return Response.json(
        { success: false, error: "Failed to fetch channels" },
        { status: response.status }
      );
    }

    const data = await response.json();

    wideEvent.outcome = "success";
    wideEvent.status_code = 200;

    return Response.json({ success: true, data });
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
