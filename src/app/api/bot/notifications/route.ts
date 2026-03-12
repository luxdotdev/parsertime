import { auth } from "@/lib/auth";
import { verifyTeamAccess } from "@/lib/bot-auth";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import type { NextRequest } from "next/server";

export async function GET() {
  const wideEvent: Record<string, unknown> = {
    route: "/api/bot/notifications",
    method: "GET",
    timestamp: new Date().toISOString(),
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

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      wideEvent.outcome = "not_found";
      wideEvent.status_code = 404;
      return Response.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const configs = await prisma.botNotificationConfig.findMany({
      where: { createdBy: user.id },
      orderBy: { createdAt: "desc" },
    });

    wideEvent.result_count = configs.length;
    wideEvent.outcome = "success";
    wideEvent.status_code = 200;

    return Response.json({ success: true, data: configs });
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

export async function POST(request: NextRequest) {
  const wideEvent: Record<string, unknown> = {
    route: "/api/bot/notifications",
    method: "POST",
    timestamp: new Date().toISOString(),
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

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      wideEvent.outcome = "not_found";
      wideEvent.status_code = 404;
      return Response.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const body = (await request.json()) as {
      guildId?: string;
      channelId?: string;
      teamIds?: number[];
    };

    if (!body.guildId || !body.channelId || !body.teamIds?.length) {
      wideEvent.outcome = "bad_request";
      wideEvent.status_code = 400;
      return Response.json(
        {
          success: false,
          error: "guildId, channelId, and teamIds are required",
        },
        { status: 400 }
      );
    }

    for (const teamId of body.teamIds) {
      const hasAccess = await verifyTeamAccess(user.id, teamId);
      if (!hasAccess) {
        wideEvent.outcome = "forbidden";
        wideEvent.status_code = 403;
        return Response.json(
          {
            success: false,
            error: `You don't have access to team ${teamId}`,
          },
          { status: 403 }
        );
      }
    }

    const config = await prisma.botNotificationConfig.create({
      data: {
        guildId: body.guildId,
        channelId: body.channelId,
        teamIds: body.teamIds,
        createdBy: user.id,
      },
    });

    wideEvent.config_id = config.id;
    wideEvent.outcome = "success";
    wideEvent.status_code = 201;

    return Response.json({ success: true, data: config }, { status: 201 });
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

export async function PATCH(request: NextRequest) {
  const wideEvent: Record<string, unknown> = {
    route: "/api/bot/notifications",
    method: "PATCH",
    timestamp: new Date().toISOString(),
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

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      wideEvent.outcome = "not_found";
      wideEvent.status_code = 404;
      return Response.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const body = (await request.json()) as {
      configId?: string;
      teamIds?: number[];
    };

    if (!body.configId || !body.teamIds?.length) {
      wideEvent.outcome = "bad_request";
      wideEvent.status_code = 400;
      return Response.json(
        { success: false, error: "configId and teamIds are required" },
        { status: 400 }
      );
    }

    const existing = await prisma.botNotificationConfig.findFirst({
      where: { id: body.configId, createdBy: user.id },
    });

    if (!existing) {
      wideEvent.outcome = "not_found";
      wideEvent.status_code = 404;
      return Response.json(
        { success: false, error: "Configuration not found" },
        { status: 404 }
      );
    }

    for (const teamId of body.teamIds) {
      const hasAccess = await verifyTeamAccess(user.id, teamId);
      if (!hasAccess) {
        wideEvent.outcome = "forbidden";
        wideEvent.status_code = 403;
        return Response.json(
          {
            success: false,
            error: `You don't have access to team ${teamId}`,
          },
          { status: 403 }
        );
      }
    }

    const config = await prisma.botNotificationConfig.update({
      where: { id: body.configId },
      data: { teamIds: body.teamIds },
    });

    wideEvent.config_id = config.id;
    wideEvent.outcome = "success";
    wideEvent.status_code = 200;

    return Response.json({ success: true, data: config });
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

export async function DELETE(request: NextRequest) {
  const wideEvent: Record<string, unknown> = {
    route: "/api/bot/notifications",
    method: "DELETE",
    timestamp: new Date().toISOString(),
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

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      wideEvent.outcome = "not_found";
      wideEvent.status_code = 404;
      return Response.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const body = (await request.json()) as { configId?: string };

    if (!body.configId) {
      wideEvent.outcome = "bad_request";
      wideEvent.status_code = 400;
      return Response.json(
        { success: false, error: "configId is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.botNotificationConfig.findFirst({
      where: { id: body.configId, createdBy: user.id },
    });

    if (!existing) {
      wideEvent.outcome = "not_found";
      wideEvent.status_code = 404;
      return Response.json(
        { success: false, error: "Configuration not found" },
        { status: 404 }
      );
    }

    await prisma.botNotificationConfig.delete({
      where: { id: body.configId },
    });

    wideEvent.config_id = body.configId;
    wideEvent.outcome = "success";
    wideEvent.status_code = 200;

    return Response.json({ success: true, data: { deleted: true } });
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
