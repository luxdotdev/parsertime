import prisma from "@/lib/prisma";
import type { NextRequest } from "next/server";

type RouteCtx = { params: Promise<{ scheduleId: string }> };

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const { scheduleId } = await ctx.params;

  const schedule = await prisma.availabilitySchedule.findUnique({
    where: { id: scheduleId },
    include: {
      team: {
        select: { id: true, name: true, availabilitySettings: true },
      },
      responses: {
        select: {
          id: true,
          displayName: true,
          slots: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!schedule?.team.availabilitySettings) {
    return new Response("Not found", { status: 404 });
  }

  return Response.json({
    schedule: {
      id: schedule.id,
      weekStart: schedule.weekStart.toISOString(),
      weekEnd: schedule.weekEnd.toISOString(),
    },
    team: {
      id: schedule.team.id,
      name: schedule.team.name,
    },
    settings: {
      slotMinutes: schedule.team.availabilitySettings.slotMinutes,
      hoursStart: schedule.team.availabilitySettings.hoursStart,
      hoursEnd: schedule.team.availabilitySettings.hoursEnd,
      timezone: schedule.team.availabilitySettings.timezone,
    },
    responses: schedule.responses,
  });
}
