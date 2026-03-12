import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { createHmac } from "crypto";

export type BotEvent = {
  type: "scrim.created";
  timestamp: string;
  teamId: number;
  data: {
    scrimName: string;
    scrimId: number;
    createdBy: string;
  };
};

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export async function dispatchBotEvent(
  teamId: number,
  event: BotEvent
): Promise<void> {
  const subscriptions = await prisma.botWebhookSubscription.findMany({
    where: {
      teamId,
      events: { has: event.type },
    },
    include: {
      botApiKey: { select: { revokedAt: true } },
    },
  });

  const activeSubscriptions = subscriptions.filter(
    (sub) => !sub.botApiKey.revokedAt
  );

  if (activeSubscriptions.length === 0) {
    return;
  }

  const payload = JSON.stringify(event);

  const results = await Promise.allSettled(
    activeSubscriptions.map(async (sub) => {
      const signature = signPayload(payload, sub.secret);

      const response = await fetch(sub.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": signature,
          "X-Webhook-Event": event.type,
        },
        body: payload,
      });

      if (!response.ok) {
        throw new Error(
          `Webhook delivery failed: ${response.status} ${response.statusText}`
        );
      }
    })
  );

  for (const result of results) {
    if (result.status === "rejected") {
      Logger.error("Bot webhook delivery failed", {
        teamId,
        eventType: event.type,
        error: (result.reason as Error).message,
      });
    }
  }
}
