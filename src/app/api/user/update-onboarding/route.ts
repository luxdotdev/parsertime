import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { unauthorized } from "next/navigation";
import type { NextRequest } from "next/server";
import { z } from "zod";

const UpdateOnboardingSchema = z.object({
  seenOnboarding: z.boolean(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !session.user || !session.user.email) unauthorized();

  const body = UpdateOnboardingSchema.safeParse(await req.json());
  if (!body.success) {
    return new Response("Invalid onboarding flag supplied", { status: 400 });
  }

  await prisma.user.update({
    where: { email: session.user.email },
    data: { seenOnboarding: body.data.seenOnboarding },
  });

  return new Response("OK", { status: 200 });
}
