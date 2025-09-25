import { getUser } from "@/data/user-dto";
import { auditLog } from "@/lib/audit-logs";
import { auth } from "@/lib/auth";
import Logger from "@/lib/logger";
import { createNewScrimFromParsedData } from "@/lib/parser";
import {
  newSuspiciousActivityWebhookConstructor,
  sendDiscordWebhook,
} from "@/lib/webhooks";
import type { ParserData } from "@/types/parser";
import type { User } from "@prisma/client";
import { Ratelimit } from "@upstash/ratelimit";
import { ipAddress } from "@vercel/functions";
import { kv } from "@vercel/kv";
import { unauthorized } from "next/navigation";
import { after, type NextRequest, userAgent } from "next/server";

export type CreateScrimRequestData = {
  name: string;
  team: string;
  date: string;
  map: ParserData;
  replayCode: string;
};

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session) {
    Logger.warn("Unauthorized request to create scrim");
    unauthorized();
  }

  // Create a new ratelimiter, that allows 5 requests per 1 minute
  const ratelimit = new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(5, "1 m"),
    analytics: true,
  });

  // Limit the requests to 5 per minute per user
  const identifier = ipAddress(request) ?? "127.0.0.1";
  const { success } = await ratelimit.limit(identifier);

  if (!success) {
    Logger.log("Rate limit exceeded for scrim creation", identifier);

    const ua = userAgent(request);

    const user = await getUser(session.user.email);

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const fallbackUser = {
      name: "Unknown",
      email: "unknown",
      id: "unknown",
    } as User;

    const wh = newSuspiciousActivityWebhookConstructor(
      user ?? fallbackUser,
      "Scrim creation (rate limit exceeded)",
      ua.ua,
      ua.browser,
      ua.os,
      ua.device
    );
    await sendDiscordWebhook(process.env.DISCORD_WEBHOOK_URL, wh);

    return new Response("Rate limit exceeded", { status: 429 });
  }

  const data = (await request.json()) as CreateScrimRequestData;

  if (data.map === null) {
    Logger.warn("Invalid map data");
    return new Response("Invalid map data", { status: 400 });
  }

  Logger.log("Creating new scrim for user: ", session.user?.email);

  await createNewScrimFromParsedData(data, session);

  after(async () => {
    await auditLog.createAuditLog({
      userEmail: session.user.email,
      action: "SCRIM_CREATED",
      target: `${data.name} (Team: ${data.team})`,
      details: `Scrim created: ${data.name}`,
    });
  });

  return new Response("OK", { status: 200 });
}
