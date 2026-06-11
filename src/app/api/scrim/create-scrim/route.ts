import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { auditLog } from "@/lib/audit-logs";
import { auth, canManageTeam } from "@/lib/auth";
import { withRequestContext } from "@/lib/axiom/baggage";
import {
  rateLimitHitCounter,
  scrimCreatedCounter,
  scrimParsingDuration,
} from "@/lib/axiom/metrics";
import { UsageEventName } from "@/lib/usage/names";
import { usage } from "@/lib/usage/server";
import { sendScrimNotifications } from "@/lib/bot-events";
import { Logger } from "@/lib/logger";
import { createNewScrimFromParsedData } from "@/lib/parser";
import { Permission } from "@/lib/permissions";
import { normalizeMapForScrim } from "@/lib/team-normalization";
import prisma from "@/lib/prisma";
import { resolveScrimLink } from "@/lib/team-ops/scrim-feedback";
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
import { z } from "zod";

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
  scrimRequestId?: string | null;
  opponentTeamId?: number | null;
};

const parserDataSchema = z.custom<ParserData>((value) => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const map = value as Record<string, unknown>;
  return (
    Array.isArray(map.match_start) &&
    Array.isArray(map.round_end) &&
    Array.isArray(map.player_stat)
  );
});

export const createScrimSchema = z.object({
  name: z.string().min(1).max(100),
  team: z
    .string()
    .regex(/^\d+$/)
    .refine((value) => Number.isSafeInteger(Number(value)), {
      message: "Team ID is too large",
    }),
  date: z.string().min(1),
  map: parserDataSchema,
  replayCode: z.string().max(100),
  opponentTeamAbbr: z.string().max(20).nullable().optional(),
  autoAssignTeamNames: z.boolean().optional(),
  team1Name: z.string().max(100).nullable().optional(),
  team2Name: z.string().max(100).nullable().optional(),
  heroBans: z
    .array(
      z.object({
        hero: z.string().min(1).max(100),
        team: z.string().min(1).max(100),
        banPosition: z.number().int().min(0),
      })
    )
    .default([]),
  scrimRequestId: z.string().min(1).nullable().optional(),
  opponentTeamId: z.number().int().positive().nullable().optional(),
});

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

      const user = await AppRuntime.runPromise(
        UserService.pipe(
          Effect.flatMap((svc) => svc.getUser(session.user.email))
        )
      );
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

    const parsed = createScrimSchema.safeParse(await request.json());
    if (!parsed.success) {
      event.outcome = "validation_error";
      event.status_code = 400;
      return Response.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
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

    const user = await AppRuntime.runPromise(
      UserService.pipe(Effect.flatMap((svc) => svc.getUser(session.user.email)))
    );
    event.user_id = user?.id;
    event.billing_plan = user?.billingPlan;

    if (!user) {
      event.outcome = "user_not_found";
      event.status_code = 404;
      return new Response("User not found", { status: 404 });
    }

    return await withRequestContext(
      {
        user_id: user.id,
        billing_plan: user.billingPlan,
      },
      async () => {
        const canCreateScrim = await new Permission("create-scrim").check();
        if (!canCreateScrim) {
          event.outcome = "permission_denied";
          event.status_code = 403;
          return new Response("Forbidden", { status: 403 });
        }

        const parsedTeamId = Number(data.team);
        const teamId = parsedTeamId === 0 ? null : parsedTeamId;
        event.team_id = teamId;
        if (teamId && !(await canManageTeam(teamId, user))) {
          event.outcome = "forbidden_team";
          event.status_code = 403;
          return new Response("Forbidden", { status: 403 });
        }

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
        const newScrimId = await createNewScrimFromParsedData(data, session);
        const parseDuration = performance.now() - parseStart;
        scrimParsingDuration.record(parseDuration);
        scrimCreatedCounter.add(1);
        void usage.track({ name: UsageEventName.SCRIM_CREATE, userId: user.id, teamId });

        event.parse_duration_ms = Math.round(parseDuration);
        event.scrim_id = newScrimId;
        event.outcome = "success";
        event.status_code = 200;

        // Linking is best-effort: the scrim is already created, so a failed
        // link update must not turn a successful creation into a 500.
        if (teamId && data.scrimRequestId && data.opponentTeamId) {
          try {
            const link = await resolveScrimLink({
              teamId,
              scrimRequestId: data.scrimRequestId,
              opponentTeamId: data.opponentTeamId,
            });
            if (link) {
              await prisma.scrim.update({
                where: { id: newScrimId },
                data: {
                  scrimRequestId: link.scrimRequestId,
                  opponentTeamId: link.opponentTeamId,
                },
              });
              event.linked_request = true;
            }
          } catch (linkErr) {
            event.link_error =
              linkErr instanceof Error ? linkErr.message : String(linkErr);
          }
        }

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
                scrimId: newScrimId,
                createdBy: session.user.email,
                teamId,
              },
            });
          }
        });

        return Response.json({ scrimId: newScrimId }, { status: 200 });
      }
    );
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
