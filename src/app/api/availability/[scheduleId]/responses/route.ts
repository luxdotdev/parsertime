import { auth } from "@/lib/auth";
import {
  hashAvailabilityPassword,
  verifyAvailabilityPassword,
} from "@/lib/availability/password";
import { normalizeNameKey, sanitizeSlots } from "@/lib/availability/slots";
import prisma from "@/lib/prisma";
import type { NextRequest } from "next/server";
import { z } from "zod";

const BodySchema = z.object({
  name: z.string().trim().min(1).max(40),
  password: z.string().min(1).max(100).optional(),
  slots: z.array(z.number().int().nonnegative()),
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
