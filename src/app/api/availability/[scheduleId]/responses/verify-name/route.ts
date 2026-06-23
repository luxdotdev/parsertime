import { normalizeNameKey } from "@/lib/availability/slots";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Ratelimit } from "@upstash/ratelimit";
import { ipAddress } from "@vercel/functions";
import { kv } from "@vercel/kv";
import type { NextRequest } from "next/server";
import { z } from "zod";

const verifyNameRatelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(30, "1 m"),
  analytics: true,
  prefix: "ratelimit:availability:verify-name",
});

const BodySchema = z.object({
  name: z.string().trim().min(1).max(40),
});

type RouteCtx = { params: Promise<{ scheduleId: string }> };

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const { scheduleId } = await ctx.params;

  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  const nameKey = normalizeNameKey(parsed.data.name);
  const identifier = ipAddress(req) ?? "127.0.0.1";
  const { success } = await verifyNameRatelimit.limit(
    `${identifier}:${scheduleId}:${nameKey}`
  );
  if (!success) {
    return new Response("Rate limit exceeded", { status: 429 });
  }

  const existing = await prisma.availabilityResponse.findUnique({
    where: { scheduleId_nameKey: { scheduleId, nameKey } },
    select: { id: true, userId: true, passwordHash: true, slots: true },
  });

  if (!existing) {
    return Response.json({ exists: false, passwordRequired: false });
  }

  const session = await auth();
  const sessionUser = session?.user?.email
    ? await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
      })
    : null;

  const ownedBySessionUser = existing.userId === sessionUser?.id;

  return Response.json({
    exists: true,
    passwordRequired: Boolean(existing.passwordHash) && !ownedBySessionUser,
    existingSlots: ownedBySessionUser ? existing.slots : undefined,
  });
}
