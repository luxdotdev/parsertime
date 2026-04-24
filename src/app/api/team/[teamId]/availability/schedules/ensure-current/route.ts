import { authenticateBotSecret } from "@/lib/bot-auth";
import { isTeamOwnerOrManager } from "@/lib/auth";
import { weekEndInTz, weekStartInTz } from "@/lib/availability/tz";
import prisma from "@/lib/prisma";
import type { NextRequest } from "next/server";

type RouteCtx = { params: Promise<{ teamId: string }> };

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const { teamId: raw } = await ctx.params;
  const teamId = parseInt(raw);
  if (!Number.isFinite(teamId)) {
    return new Response("Invalid team id", { status: 400 });
  }

  const authed =
    authenticateBotSecret(req) || (await isTeamOwnerOrManager(teamId));
  if (!authed) {
    return new Response("Unauthorized", { status: 401 });
  }

  const settings = await prisma.teamAvailabilitySettings.upsert({
    where: { teamId },
    create: { teamId },
    update: {},
  });

  const now = new Date();
  const weekStart = weekStartInTz(now, settings.timezone);
  const weekEnd = weekEndInTz(weekStart, settings.timezone);

  const schedule = await prisma.availabilitySchedule.upsert({
    where: { teamId_weekStart: { teamId, weekStart } },
    create: { teamId, weekStart, weekEnd },
    update: {},
  });

  const baseUrl =
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "https://parsertime.app";
  const url = `${baseUrl}/team/${teamId}/availability/${schedule.id}`;

  return Response.json({
    scheduleId: schedule.id,
    weekStart: schedule.weekStart.toISOString(),
    weekEnd: schedule.weekEnd.toISOString(),
    url,
  });
}
