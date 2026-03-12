import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { context, propagation } from "@opentelemetry/api";

export type ScrimNotification = {
  event: "scrim.created";
  data: {
    scrimName: string;
    scrimId: number;
    createdBy: string;
    teamId: number;
  };
};

export async function sendScrimNotifications(
  teamId: number,
  notification: ScrimNotification
): Promise<void> {
  const configs = await prisma.botNotificationConfig.findMany({
    where: {
      teamIds: { has: teamId },
    },
  });

  if (configs.length === 0) {
    return;
  }

  const botApiUrl = process.env.BOT_API_URL;
  const botSecret = process.env.BOT_SECRET;

  if (!botApiUrl || !botSecret) {
    Logger.error("BOT_API_URL or BOT_SECRET not configured");
    return;
  }

  const results = await Promise.allSettled(
    configs.map(async (config) => {
      const traceHeaders: Record<string, string> = {};
      propagation.inject(context.active(), traceHeaders);

      const response = await fetch(`${botApiUrl}/api/notifications/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${botSecret}`,
          ...traceHeaders,
        },
        body: JSON.stringify({
          guildId: config.guildId,
          channelId: config.channelId,
          event: notification.event,
          data: notification.data,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Notification delivery failed: ${response.status} ${response.statusText}`
        );
      }
    })
  );

  for (const result of results) {
    if (result.status === "rejected") {
      Logger.error("Bot notification delivery failed", {
        teamId,
        event: notification.event,
        error: (result.reason as Error).message,
      });
    }
  }
}
