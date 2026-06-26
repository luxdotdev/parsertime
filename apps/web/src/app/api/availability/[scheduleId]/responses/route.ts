import { auth } from "@/lib/auth";
import {
  hashAvailabilityPassword,
  verifyAvailabilityPassword,
} from "@/lib/availability/password";
import { normalizeNameKey, sanitizeSlots } from "@/lib/availability/slots";
import prisma from "@/lib/prisma";
import { Ratelimit } from "@upstash/ratelimit";
import { ipAddress } from "@vercel/functions";
import { kv } from "@vercel/kv";
import type { NextRequest } from "next/server";
import { z } from "zod";

const submitRatelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(20, "1 m"),
  analytics: true,
  prefix: "ratelimit:availability:submit",
});

const nameRatelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(6, "1 m"),
  analytics: true,
  prefix: "ratelimit:availability:name",
});

const BodySchema = z.object({
  name: z.string().trim().min(1).max(40),
  password: z.string().min(1).max(100).optional(),
  slots: z.array(z.number().int().nonnegative()).max(7 * 24 * 4),
  submittedFromTz: z.string().max(64).optional(),
});

type RouteCtx = { params: Promise<{ scheduleId: string }> };

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const { scheduleId } = await ctx.params;

  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid body", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const schedule = await prisma.availabilitySchedule.findUnique({
    where: { id: scheduleId },
    include: { team: { select: { availabilitySettings: true } } },
  });
  if (!schedule?.team.availabilitySettings) {
    return new Response("Not found", { status: 404 });
  }

  const settings = schedule.team.availabilitySettings;
  const slots = sanitizeSlots(parsed.data.slots, settings);
  const nameKey = normalizeNameKey(parsed.data.name);
  const displayName = parsed.data.name.trim();
  const identifier = ipAddress(req) ?? "127.0.0.1";
  const [submitLimit, nameLimit] = await Promise.all([
    submitRatelimit.limit(`${identifier}:${scheduleId}`),
    nameRatelimit.limit(`${identifier}:${scheduleId}:${nameKey}`),
  ]);
  if (!submitLimit.success || !nameLimit.success) {
    return new Response("Rate limit exceeded", { status: 429 });
  }

  const session = await auth();
  const sessionUser = session?.user?.email
    ? await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, name: true },
      })
    : null;

  const existing = await prisma.availabilityResponse.findUnique({
    where: { scheduleId_nameKey: { scheduleId, nameKey } },
  });

  if (existing) {
    const ownedBySessionUser = existing.userId === sessionUser?.id;
    if (existing.userId && !ownedBySessionUser) {
      return new Response("Forbidden", { status: 403 });
    }
    if (!ownedBySessionUser) {
      if (existing.passwordHash) {
        if (!parsed.data.password) {
          return Response.json(
            { error: "Password required", passwordRequired: true },
            { status: 401 }
          );
        }
        const ok = await verifyAvailabilityPassword(
          parsed.data.password,
          existing.passwordHash
        );
        if (!ok) {
          return Response.json(
            { error: "Incorrect password" },
            { status: 401 }
          );
        }
      }
    }

    const updated = await prisma.availabilityResponse.update({
      where: { id: existing.id },
      data: {
        displayName,
        slots,
        submittedFromTz: parsed.data.submittedFromTz ?? null,
        userId: sessionUser?.id ?? existing.userId,
      },
      select: { id: true, displayName: true, slots: true, updatedAt: true },
    });
    return Response.json({ response: updated });
  }

  const responseCount = await prisma.availabilityResponse.count({
    where: { scheduleId },
  });
  if (responseCount >= 200) {
    return new Response("Response limit reached", { status: 403 });
  }

  const passwordHash = sessionUser
    ? null
    : parsed.data.password
      ? await hashAvailabilityPassword(parsed.data.password)
      : null;

  const created = await prisma.availabilityResponse.create({
    data: {
      scheduleId,
      nameKey,
      displayName,
      slots,
      submittedFromTz: parsed.data.submittedFromTz ?? null,
      userId: sessionUser?.id ?? null,
      passwordHash,
    },
    select: { id: true, displayName: true, slots: true, updatedAt: true },
  });

  return Response.json({ response: created });
}
