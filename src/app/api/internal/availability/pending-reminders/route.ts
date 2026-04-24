import { authenticateBotSecret } from "@/lib/bot-auth";
import { buildReminderJob, type ReminderJob } from "@/lib/availability/build-reminder";
import {
  isWithinReminderWindow,
  wasFiredThisWeek,
} from "@/lib/availability/reminder";
import { weekStartInTz } from "@/lib/availability/tz";
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

  const pending: ReminderJob[] = [];

  for (const s of enabled) {
    if (!isWithinReminderWindow(now, s)) continue;

    const weekStart = weekStartInTz(now, s.timezone);
    if (wasFiredThisWeek(s.lastReminderFiredAt, weekStart)) continue;

    const job = await buildReminderJob(s.teamId, baseUrl);
    if (job) pending.push(job);
  }

  return Response.json({ pending });
}
