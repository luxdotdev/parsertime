import { authenticateBotSecret } from "@/lib/bot-auth";
import {
  isWithinReminderWindow,
  wasFiredThisWeek,
} from "@/lib/availability/reminder";
import { weekEndInTz, weekStartInTz } from "@/lib/availability/tz";
import prisma from "@/lib/prisma";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  if (!authenticateBotSecret(req)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const now = new Date();
  const baseUrl =
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "https://parsertime.app";

  const enabled = await prisma.teamAvailabilitySettings.findMany({
    where: { reminderEnabled: true },
  });

  type PendingJob = {
    teamId: number;
    teamName: string;
    scheduleId: string;
    url: string;
    guildId: string | null;
    channelId: string | null;
    roleId: string | null;
  };
  const pending: PendingJob[] = [];

  for (const s of enabled) {
    if (!isWithinReminderWindow(now, s)) continue;

    const weekStart = weekStartInTz(now, s.timezone);
    if (wasFiredThisWeek(s.lastReminderFiredAt, weekStart)) continue;

    const channelId =
      s.reminderChannelId ??
      (
        await prisma.botNotificationConfig.findFirst({
          where: { teamIds: { has: s.teamId } },
          select: { channelId: true, guildId: true },
        })
      )?.channelId ??
      null;
    const guildId =
      s.reminderGuildId ??
      (
        await prisma.botNotificationConfig.findFirst({
          where: { teamIds: { has: s.teamId } },
          select: { guildId: true },
        })
      )?.guildId ??
      null;

    if (!channelId || !guildId) continue;

    const weekEnd = weekEndInTz(weekStart, s.timezone);
    const schedule = await prisma.availabilitySchedule.upsert({
      where: { teamId_weekStart: { teamId: s.teamId, weekStart } },
      create: { teamId: s.teamId, weekStart, weekEnd },
      update: {},
    });

    const team = await prisma.team.findUnique({
      where: { id: s.teamId },
      select: { name: true },
    });

    pending.push({
      teamId: s.teamId,
      teamName: team?.name ?? "Team",
      scheduleId: schedule.id,
      url: `${baseUrl}/team/${s.teamId}/availability/${schedule.id}`,
      guildId,
      channelId,
      roleId: s.reminderRoleId,
    });
  }

  return Response.json({ pending });
}
