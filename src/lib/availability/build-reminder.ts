import prisma from "@/lib/prisma";
import { weekEndInTz, weekStartInTz } from "./tz";

export type ReminderJob = {
  teamId: number;
  teamName: string;
  scheduleId: string;
  url: string;
  weekStart: string;
  weekEnd: string;
  guildId: string;
  channelId: string;
  roleId: string | null;
};

/**
 * Resolves the current week's schedule + channel/guild/role for a team so
 * the bot can post a reminder. Upserts the schedule if it doesn't exist yet.
 * Returns null if the team has no availability settings, or if neither
 * the per-team override nor the BotNotificationConfig row supplies a
 * channel/guild pair for the bot to post into.
 */
export async function buildReminderJob(
  teamId: number,
  baseUrl: string
): Promise<ReminderJob | null> {
  const settings = await prisma.teamAvailabilitySettings.findUnique({
    where: { teamId },
  });
  if (!settings) return null;

  const fallback = await prisma.botNotificationConfig.findFirst({
    where: { teamIds: { has: teamId } },
    select: { channelId: true, guildId: true },
  });

  const channelId = settings.reminderChannelId ?? fallback?.channelId ?? null;
  const guildId = settings.reminderGuildId ?? fallback?.guildId ?? null;
  if (!channelId || !guildId) return null;

  const now = new Date();
  const weekStart = weekStartInTz(now, settings.timezone);
  const weekEnd = weekEndInTz(weekStart, settings.timezone);

  const schedule = await prisma.availabilitySchedule.upsert({
    where: { teamId_weekStart: { teamId, weekStart } },
    create: { teamId, weekStart, weekEnd },
    update: {},
  });

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { name: true },
  });

  return {
    teamId,
    teamName: team?.name ?? "Team",
    scheduleId: schedule.id,
    url: `${baseUrl}/team/${teamId}/availability/${schedule.id}`,
    weekStart: schedule.weekStart.toISOString(),
    weekEnd: schedule.weekEnd.toISOString(),
    guildId,
    channelId,
    roleId: settings.reminderRoleId,
  };
}
