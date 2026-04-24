import { authenticateBotSecret } from "@/lib/bot-auth";
import prisma from "@/lib/prisma";
import type { NextRequest } from "next/server";
import { z } from "zod";

const BodySchema = z.object({
  teamId: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  if (!authenticateBotSecret(req)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  await prisma.teamAvailabilitySettings.update({
    where: { teamId: parsed.data.teamId },
    data: { lastReminderFiredAt: new Date() },
  });

  return Response.json({ ok: true });
}
