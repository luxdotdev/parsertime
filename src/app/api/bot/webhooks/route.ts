import { authenticateBotRequest } from "@/lib/bot-auth";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { randomBytes } from "crypto";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const wideEvent: Record<string, unknown> = {
    route: "/api/bot/webhooks",
    method: "POST",
    timestamp: new Date().toISOString(),
    action: "create",
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

    const body = (await request.json()) as {
      teamId?: number;
      webhookUrl?: string;
      events?: string[];
    };

    if (!body.teamId || !body.webhookUrl || !body.events?.length) {
      wideEvent.outcome = "bad_request";
      wideEvent.status_code = 400;
      return Response.json(
        {
          success: false,
          error: "teamId, webhookUrl, and events are required",
        },
        { status: 400 }
      );
    }

    const secret = randomBytes(32).toString("hex");

    const subscription = await prisma.botWebhookSubscription.create({
      data: {
        botApiKeyId: botAuth.keyId,
        teamId: body.teamId,
        webhookUrl: body.webhookUrl,
        events: body.events,
        secret,
      },
    });

    wideEvent.subscription_id = subscription.id;
    wideEvent.outcome = "success";
    wideEvent.status_code = 201;

    return Response.json(
      {
        success: true,
        data: {
          id: subscription.id,
          teamId: subscription.teamId,
          webhookUrl: subscription.webhookUrl,
          events: subscription.events,
          secret, // Only returned once
          createdAt: subscription.createdAt,
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

export async function GET(request: NextRequest) {
  const wideEvent: Record<string, unknown> = {
    route: "/api/bot/webhooks",
    method: "GET",
    timestamp: new Date().toISOString(),
    action: "list",
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

    const subscriptions = await prisma.botWebhookSubscription.findMany({
      where: { botApiKeyId: botAuth.keyId },
      select: {
        id: true,
        teamId: true,
        webhookUrl: true,
        events: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    wideEvent.result_count = subscriptions.length;
    wideEvent.outcome = "success";
    wideEvent.status_code = 200;

    return Response.json({ success: true, data: subscriptions });
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
    route: "/api/bot/webhooks",
    method: "DELETE",
    timestamp: new Date().toISOString(),
    action: "delete",
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

    const body = (await request.json()) as { subscriptionId?: string };

    if (!body.subscriptionId) {
      wideEvent.outcome = "bad_request";
      wideEvent.status_code = 400;
      return Response.json(
        { success: false, error: "subscriptionId is required" },
        { status: 400 }
      );
    }

    const subscription = await prisma.botWebhookSubscription.findFirst({
      where: { id: body.subscriptionId, botApiKeyId: botAuth.keyId },
    });

    if (!subscription) {
      wideEvent.outcome = "not_found";
      wideEvent.status_code = 404;
      return Response.json(
        { success: false, error: "Subscription not found" },
        { status: 404 }
      );
    }

    await prisma.botWebhookSubscription.delete({
      where: { id: body.subscriptionId },
    });

    wideEvent.subscription_id = body.subscriptionId;
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
