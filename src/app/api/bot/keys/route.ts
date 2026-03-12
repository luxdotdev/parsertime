import { auth } from "@/lib/auth";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { randomBytes } from "crypto";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const wideEvent: Record<string, unknown> = {
    route: "/api/bot/keys",
    method: "POST",
    timestamp: new Date().toISOString(),
    action: "create",
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
    wideEvent.user_email = session.user.email;

    const body = (await request.json()) as {
      name?: string;
      guildId?: string;
      teamId?: number;
    };

    if (!body.name || !body.guildId) {
      wideEvent.outcome = "bad_request";
      wideEvent.status_code = 400;
      return Response.json(
        { success: false, error: "name and guildId are required" },
        { status: 400 }
      );
    }

    // Verify user owns or manages a team
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true },
    });

    if (!user) {
      wideEvent.outcome = "not_found";
      wideEvent.status_code = 404;
      return Response.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const key = randomBytes(32).toString("hex");

    const botApiKey = await prisma.botApiKey.create({
      data: {
        key,
        name: body.name,
        guildId: body.guildId,
        createdBy: user.id,
      },
    });

    wideEvent.key_id = botApiKey.id;
    wideEvent.key_name = body.name;
    wideEvent.outcome = "success";
    wideEvent.status_code = 201;

    return Response.json(
      {
        success: true,
        data: {
          id: botApiKey.id,
          key, // Only returned once
          name: botApiKey.name,
          guildId: botApiKey.guildId,
          createdAt: botApiKey.createdAt,
        },
      },
      { status: 201 }
    );
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

export async function GET() {
  const wideEvent: Record<string, unknown> = {
    route: "/api/bot/keys",
    method: "GET",
    timestamp: new Date().toISOString(),
    action: "list",
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
    wideEvent.user_email = session.user.email;

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

    const keys = await prisma.botApiKey.findMany({
      where: { createdBy: user.id, revokedAt: null },
      select: {
        id: true,
        name: true,
        guildId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    wideEvent.result_count = keys.length;
    wideEvent.outcome = "success";
    wideEvent.status_code = 200;

    return Response.json({ success: true, data: keys });
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
    route: "/api/bot/keys",
    method: "DELETE",
    timestamp: new Date().toISOString(),
    action: "revoke",
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
    wideEvent.user_email = session.user.email;

    const body = (await request.json()) as { keyId?: string };

    if (!body.keyId) {
      wideEvent.outcome = "bad_request";
      wideEvent.status_code = 400;
      return Response.json(
        { success: false, error: "keyId is required" },
        { status: 400 }
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

    const botApiKey = await prisma.botApiKey.findFirst({
      where: { id: body.keyId, createdBy: user.id },
    });

    if (!botApiKey) {
      wideEvent.outcome = "not_found";
      wideEvent.status_code = 404;
      return Response.json(
        { success: false, error: "API key not found" },
        { status: 404 }
      );
    }

    await prisma.botApiKey.update({
      where: { id: body.keyId },
      data: { revokedAt: new Date() },
    });

    wideEvent.key_id = body.keyId;
    wideEvent.outcome = "success";
    wideEvent.status_code = 200;

    return Response.json({ success: true, data: { revoked: true } });
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
