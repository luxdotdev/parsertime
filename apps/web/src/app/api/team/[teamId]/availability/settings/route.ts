import { auth, isAuthedToViewTeam, isTeamOwnerOrManager } from "@/lib/auth";
import { isValidTimeZone } from "@/lib/availability/tz";
import {
  verifyUserCanUseChannel,
  verifyUserInGuild,
} from "@/lib/bot-discord-access";
import prisma from "@/lib/prisma";
import type { NextRequest } from "next/server";
import { z } from "zod";

const DiscordSnowflakeSchema = z.string().regex(/^\d{17,20}$/);
const OptionalDiscordSnowflakeSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  DiscordSnowflakeSchema.nullable().optional()
);

const SettingsSchema = z.object({
  slotMinutes: z.union([z.literal(15), z.literal(30), z.literal(60)]),
  hoursStart: z.number().int().min(0).max(23),
  hoursEnd: z.number().int().min(1).max(24),
  timezone: z.string().min(1).max(64),
  reminderEnabled: z.boolean(),
  reminderDayOfWeek: z.number().int().min(0).max(6),
  reminderHour: z.number().int().min(0).max(23),
  reminderMinute: z.number().int().min(0).max(59),
  reminderRoleId: OptionalDiscordSnowflakeSchema,
  reminderGuildId: OptionalDiscordSnowflakeSchema,
  reminderChannelId: OptionalDiscordSnowflakeSchema,
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
  if (!isValidTimeZone(data.timezone)) {
    return Response.json({ error: "Invalid timezone" }, { status: 400 });
  }

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

  if (data.reminderGuildId || data.reminderChannelId) {
    if (!data.reminderGuildId || !data.reminderChannelId) {
      return Response.json(
        { error: "reminderGuildId and reminderChannelId must be set together" },
        { status: 400 }
      );
    }

    const session = await auth();
    const user = session?.user?.email
      ? await prisma.user.findUnique({
          where: { email: session.user.email },
          select: {
            accounts: {
              where: { providerId: "discord" },
              select: { accountId: true },
              take: 1,
            },
          },
        })
      : null;
    const discordAccount = user?.accounts[0];
    if (!discordAccount) {
      return Response.json(
        { error: "Discord account not linked", code: "discord_not_linked" },
        { status: 403 }
      );
    }

    const membership = await verifyUserInGuild(
      discordAccount.accountId,
      data.reminderGuildId
    );
    if (!membership.ok) {
      if (membership.reason === "misconfigured") {
        return Response.json(
          { error: "Bot service not configured" },
          { status: 503 }
        );
      }
      return Response.json(
        { error: "You are not a member of that server" },
        { status: 403 }
      );
    }

    const channelAccess = await verifyUserCanUseChannel(
      discordAccount.accountId,
      data.reminderGuildId,
      data.reminderChannelId
    );
    if (!channelAccess.ok) {
      if (channelAccess.reason === "misconfigured") {
        return Response.json(
          { error: "Bot service not configured" },
          { status: 503 }
        );
      }
      return Response.json(
        { error: "You cannot use that channel" },
        { status: 403 }
      );
    }
  }

  const settings = await prisma.teamAvailabilitySettings.upsert({
    where: { teamId },
    create: { teamId, ...data },
    update: data,
  });

  return Response.json({ settings });
}
