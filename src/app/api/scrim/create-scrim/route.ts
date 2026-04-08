import { getUser } from "@/data/user-dto";
import { auditLog } from "@/lib/audit-logs";
import { auth } from "@/lib/auth";
import { setRequestContext } from "@/lib/axiom/baggage";
import {
  rateLimitHitCounter,
  scrimCreatedCounter,
  scrimParsingDuration,
} from "@/lib/axiom/metrics";
import { sendScrimNotifications } from "@/lib/bot-events";
import { Logger } from "@/lib/logger";
import { createNewScrimFromParsedData } from "@/lib/parser";
import { normalizeMapForScrim } from "@/lib/team-normalization";
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
  opponentTeamAbbr?: string | null;
  autoAssignTeamNames?: boolean;
  team1Name?: string | null;
  team2Name?: string | null;
  heroBans: {
    hero: string;
    team: string;
    banPosition: number;
  }[];
};

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const event: Record<string, unknown> = {
    route: "POST /api/scrim/create-scrim",
    timestamp: new Date().toISOString(),
  };

  try {
    const session = await auth();

    if (!session) {
      event.outcome = "unauthorized";
      event.status_code = 401;
      unauthorized();
    }

    event.user_email = session.user.email;

    // Create a new ratelimiter, that allows 5 requests per 1 minute
    const ratelimit = new Ratelimit({
      redis: kv,
      limiter: Ratelimit.slidingWindow(5, "1 m"),
      analytics: true,
    });

    // Limit the requests to 5 per minute per user
    const identifier = ipAddress(request) ?? "127.0.0.1";
    event.ip = identifier;
    const { success } = await ratelimit.limit(identifier);

    if (!success) {
      rateLimitHitCounter.add(1, { endpoint: "scrim.create" });
      event.outcome = "rate_limited";
      event.status_code = 429;

      const ua = userAgent(request);
      event.user_agent = ua.ua;

      const user = await getUser(session.user.email);
      event.user_id = user?.id;
      event.billing_plan = user?.billingPlan;

      // oxlint-disable-next-line @typescript-eslint/consistent-type-assertions
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

      after(async () => {
        await auditLog.createAuditLog({
          userEmail: "System",
          action: "SUSPICIOUS_ACTIVITY_DETECTED",
          target: `${user?.email ?? "Unknown"}`,
          details: `Scrim creation (rate limit exceeded) by ${user?.name} (${user?.email})`,
        });
      });

      return new Response("Rate limit exceeded", { status: 429 });
    }

    const data = (await request.json()) as CreateScrimRequestData;
    event.scrim_name = data.name;
    event.team_id_raw = data.team;
    event.has_hero_bans = data.heroBans.length > 0;
    event.hero_ban_count = data.heroBans.length;
    event.auto_assign_team_names = data.autoAssignTeamNames ?? false;

    if (data.map === null) {
      event.outcome = "invalid_map_data";
      event.status_code = 400;
      return new Response("Invalid map data", { status: 400 });
    }

    const user = await getUser(session.user.email);
    event.user_id = user?.id;
    event.billing_plan = user?.billingPlan;

    if (user) {
      setRequestContext({
        user_id: user.id,
        billing_plan: user.billingPlan,
      });
    }

    const teamId = parseInt(data.team) === 0 ? null : parseInt(data.team);
    event.team_id = teamId;

    if (data.autoAssignTeamNames && teamId && data.team1Name) {
      event.normalized_teams = true;
      data.map = await normalizeMapForScrim(
        data.map,
        teamId,
        data.team1Name,
        data.team2Name ?? null
      );
    }

    const parseStart = performance.now();
    await createNewScrimFromParsedData(data, session);
    const parseDuration = performance.now() - parseStart;
    scrimParsingDuration.record(parseDuration);
    scrimCreatedCounter.add(1);

    event.parse_duration_ms = Math.round(parseDuration);
    event.outcome = "success";
    event.status_code = 200;

    after(async () => {
      await auditLog.createAuditLog({
        userEmail: session.user.email,
        action: "SCRIM_CREATED",
        target: `${data.name} (Team: ${data.team})`,
        details: `Scrim created: ${data.name}`,
      });

      if (teamId) {
        await sendScrimNotifications(teamId, {
          event: "scrim.created",
          data: {
            scrimName: data.name,
            scrimId: 0, // Scrim ID not returned from parser
            createdBy: session.user.email,
            teamId,
          },
        });
      }
    });

    return new Response("OK", { status: 200 });
  } catch (error) {
    event.outcome = "error";
    event.status_code = 500;
    event.error = {
      message: error instanceof Error ? error.message : String(error),
      type: error instanceof Error ? error.name : "UnknownError",
    };
    throw error;
  } finally {
    event.duration_ms = Date.now() - startTime;
    Logger.info(event);
  }
}
