import { auth, getCurrentUser, isAdminUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { $Enums } from "@/generated/prisma/client";
import { unauthorized } from "next/navigation";
import type { NextRequest } from "next/server";
import { z } from "zod";

const UpdateTitleSchema = z.object({
  userId: z.string(),
  appliedTitleId: z.number().optional(),
  newTitle: z.enum($Enums.Title),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) unauthorized();

  const body = UpdateTitleSchema.safeParse(await req.json());
  if (!body.success) {
    return new Response("Invalid request body", { status: 400 });
  }

  const currentUser = await getCurrentUser();
  if (!currentUser) unauthorized();

  if (body.data.userId !== currentUser.id && !isAdminUser(currentUser)) {
    return new Response("Forbidden", { status: 403 });
  }

  // list of all titles this user has unlocked
  const userTitles = await prisma.user.findUnique({
    where: { id: body.data.userId },
    select: { titles: true },
  });

  if (userTitles?.titles.includes(body.data.newTitle)) {
    await prisma.$transaction(async (tx) => {
      await tx.appliedTitle.deleteMany({
        where: { userId: body.data.userId },
      });
      await tx.appliedTitle.create({
        data: { userId: body.data.userId, title: body.data.newTitle },
      });
    });
  } else {
    // deny the request
    return new Response("Title not allowed to be applied to this user", {
      status: 403,
    });
  }

  return new Response("OK", { status: 200 });
}
