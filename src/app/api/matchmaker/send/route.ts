import { Effect } from "effect";
import { auth } from "@/lib/auth";
import { sendScrimRequest } from "@/lib/matchmaker/send";
import { Logger } from "@/lib/logger";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { z } from "zod";
import { unauthorized } from "next/navigation";
import type { NextRequest } from "next/server";

const bodySchema = z.object({
  fromTeamId: z.number().int().positive(),
  toTeamId: z.number().int().positive(),
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const event: Record<string, unknown> = {
    route: "POST /api/matchmaker/send",
    timestamp: new Date().toISOString(),
  };

  try {
    const session = await auth();
    if (!session) {
      event.outcome = "unauthorized";
      event.status_code = 401;
      unauthorized();
    }

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      event.outcome = "bad_request";
      event.status_code = 400;
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }

    if (parsed.data.fromTeamId === parsed.data.toTeamId) {
      event.outcome = "self_target";
      event.status_code = 400;
      return Response.json(
        { error: "Cannot send a scrim request to your own team" },
        { status: 400 }
      );
    }

    const user = await AppRuntime.runPromise(
      UserService.pipe(Effect.flatMap((svc) => svc.getUser(session.user.email)))
    );
    if (!user) {
      event.outcome = "user_not_found";
      event.status_code = 401;
      return Response.json({ error: "User not found" }, { status: 401 });
    }
    event.user_id = user.id;
    event.from_team_id = parsed.data.fromTeamId;
    event.to_team_id = parsed.data.toTeamId;

    const result = await sendScrimRequest({
      fromTeamId: parsed.data.fromTeamId,
      toTeamId: parsed.data.toTeamId,
      sentByUserId: user.id,
    });

    if (!result.ok) {
      event.outcome = "rejected";
      event.status_code = result.status;
      event.reason = result.reason;
      return Response.json({ error: result.reason }, { status: result.status });
    }

    event.outcome = "success";
    event.status_code = 200;
    event.request_id = result.requestId;
    return Response.json({ requestId: result.requestId });
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
