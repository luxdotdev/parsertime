import {
  authenticateBotSecret,
  resolveDiscordUser,
  verifyTeamAccess,
} from "@/lib/bot-auth";
import { buildReminderJob } from "@/lib/availability/build-reminder";
import type { NextRequest } from "next/server";
import { z } from "zod";

const BodySchema = z.object({
  teamId: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  if (!authenticateBotSecret(req)) {
    return Response.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const discordId = req.headers.get("X-Discord-User-Id");
  if (!discordId) {
    return Response.json(
      { success: false, error: "X-Discord-User-Id header is required" },
      { status: 400 }
    );
  }

  const user = await resolveDiscordUser(discordId);
  if (!user) {
    return Response.json(
      {
        success: false,
        error:
          "Link your Discord account at parsertime.app/settings to use this command",
      },
      { status: 403 }
    );
  }

  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json(
      { success: false, error: "Invalid body" },
      { status: 400 }
    );
  }

  const { teamId } = parsed.data;
  if (!(await verifyTeamAccess(user.id, teamId))) {
    return Response.json(
      { success: false, error: "You don't have access to this team" },
      { status: 403 }
    );
  }

  const baseUrl =
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "https://parsertime.app";
  const job = await buildReminderJob(teamId, baseUrl);
  if (!job) {
    return Response.json(
      {
        success: false,
        error:
          "Team has no availability settings or no Discord channel configured",
      },
      { status: 400 }
    );
  }

  return Response.json({ success: true, data: job });
}
