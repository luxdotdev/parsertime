import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { auditLog } from "@/lib/audit-logs";
import { auth, canManageTeam } from "@/lib/auth";
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
import { createNdjsonStream } from "@/lib/progress-stream";
import { normalizeMapForScrim } from "@/lib/team-normalization";
import { resolveScrimLink } from "@/lib/team-ops/scrim-feedback";
import prisma from "@/lib/prisma";
import { Ratelimit } from "@upstash/ratelimit";
import { ipAddress } from "@vercel/functions";
import { kv } from "@vercel/kv";
import { Effect } from "effect";
import { unauthorized } from "next/navigation";
import type { NextRequest } from "next/server";
import { createScrimSchema } from "../create-scrim/route";

/**
 * Streaming variant of POST /api/scrim/create-scrim. Runs the same guards
 * (auth, rate limit, validation, permission, normalization) and then streams
 * NDJSON progress while the first map's rows insert, finishing with a "done"
 * event that carries the new scrim id. The non-streaming route stays intact as
 * a fallback.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const event: Record<string, unknown> = {
    route: "POST /api/scrim/create-scrim-stream",
    timestamp: new Date().toISOString(),
  };

  const session = await auth();
  if (!session) {
    unauthorized();
  }

  const ratelimit = new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(5, "1 m"),
    analytics: true,
  });
  const identifier = ipAddress(request) ?? "127.0.0.1";
  const { success } = await ratelimit.limit(identifier);
  if (!success) {
    rateLimitHitCounter.add(1, { endpoint: "scrim.create" });
    return new Response("Rate limit exceeded", { status: 429 });
  }

  const parsed = createScrimSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const data = parsed.data;

  const user = await AppRuntime.runPromise(
    UserService.pipe(Effect.flatMap((svc) => svc.getUser(session.user.email)))
  );
  if (!user) {
    return new Response("User not found", { status: 404 });
  }

  const canCreateScrim = await new Permission("create-scrim").check();
  if (!canCreateScrim) {
    return new Response("Forbidden", { status: 403 });
  }

  const parsedTeamId = Number(data.team);
  const teamId = parsedTeamId === 0 ? null : parsedTeamId;
  event.team_id = teamId;
  if (teamId && !(await canManageTeam(teamId, user))) {
    return new Response("Forbidden", { status: 403 });
  }

  if (data.autoAssignTeamNames && teamId && data.team1Name) {
    data.map = await normalizeMapForScrim(
      data.map,
      teamId,
      data.team1Name,
      data.team2Name ?? null
    );
  }

  return createNdjsonStream(async (emit) => {
    try {
      const parseStart = performance.now();
      const newScrimId = await createNewScrimFromParsedData(
        data,
        session,
        (completed, total) => emit({ type: "progress", completed, total })
      );
      const parseDuration = performance.now() - parseStart;
      scrimParsingDuration.record(parseDuration);
      scrimCreatedCounter.add(1);
      void usage.track({
        name: UsageEventName.SCRIM_CREATE,
        userId: user.id,
        teamId,
      });

      // Linking is best-effort: the scrim is already created, so a failed link
      // update must not surface as a creation error (which would prompt a retry
      // and a duplicate scrim).
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

      emit({ type: "done", scrimId: newScrimId });
      event.outcome = "success";
      event.scrim_id = newScrimId;
      event.parse_duration_ms = Math.round(parseDuration);

      try {
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
      } catch {
        // Audit/notifications are best-effort; the scrim is already created.
      }
    } catch (e) {
      event.outcome = "error";
      event.error = e instanceof Error ? e.message : String(e);
      emit({
        type: "error",
        message: e instanceof Error ? e.message : "Internal Server Error",
      });
    } finally {
      event.duration_ms = Date.now() - startTime;
      Logger.info(event);
    }
  });
}
