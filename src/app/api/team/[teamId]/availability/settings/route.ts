import { isAuthedToViewTeam, isTeamOwnerOrManager } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { NextRequest } from "next/server";
import { z } from "zod";

const SettingsSchema = z.object({
  slotMinutes: z.union([z.literal(15), z.literal(30), z.literal(60)]),
  hoursStart: z.number().int().min(0).max(23),
  hoursEnd: z.number().int().min(1).max(24),
  timezone: z.string().min(1).max(64),
  reminderEnabled: z.boolean(),
  reminderDayOfWeek: z.number().int().min(0).max(6),
  reminderHour: z.number().int().min(0).max(23),
  reminderMinute: z.number().int().min(0).max(59),
  reminderRoleId: z.string().nullable().optional(),
  reminderGuildId: z.string().nullable().optional(),
  reminderChannelId: z.string().nullable().optional(),
});

type RouteCtx = { params: Promise<{ teamId: string }> };

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const { teamId: raw } = await ctx.params;
  const teamId = parseInt(raw);
  if (!Number.isFinite(teamId)) {
    return new Response("Invalid team id", { status: 400 });
  }

  if (!(await isAuthedToViewTeam(teamId))) {
    return new Response("Unauthorized", { status: 401 });
  }

  const settings = await prisma.teamAvailabilitySettings.findUnique({
    where: { teamId },
  });
  return Response.json({ settings });
}

export async function PUT(req: NextRequest, ctx: RouteCtx) {
  const { teamId: raw } = await ctx.params;
  const teamId = parseInt(raw);
  if (!Number.isFinite(teamId)) {
    return new Response("Invalid team id", { status: 400 });
  }

  if (!(await isTeamOwnerOrManager(teamId))) {
    return new Response("Unauthorized", { status: 401 });
  }

  const parsed = SettingsSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid body", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const data = parsed.data;
  if (data.hoursEnd <= data.hoursStart) {
    return Response.json(
      { error: "hoursEnd must be greater than hoursStart" },
      { status: 400 }
    );
  }

  const minutesInWindow = (data.hoursEnd - data.hoursStart) * 60;
  if (minutesInWindow % data.slotMinutes !== 0) {
    return Response.json(
      { error: "hours window must be a multiple of slotMinutes" },
      { status: 400 }
    );
  }

  const settings = await prisma.teamAvailabilitySettings.upsert({
    where: { teamId },
    create: { teamId, ...data },
    update: data,
  });

  return Response.json({ settings });
}
