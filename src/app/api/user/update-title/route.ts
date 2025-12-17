import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { $Enums } from "@prisma/client";
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
  if (!session || !session.user || !session.user.email) unauthorized();

  const body = UpdateTitleSchema.safeParse(await req.json());
  if (!body.success) {
    return new Response("Invalid request body", { status: 400 });
  }

  // list of all titles this user has unlocked
  const userTitles = await prisma.user.findUnique({
    where: { id: body.data.userId },
    select: { titles: true },
  });

  if (userTitles?.titles.includes(body.data.newTitle)) {
    // set the applied title to the new title
    const existingTitle = await prisma.appliedTitle.findFirst({
      where: { userId: body.data.userId },
    });

    if (existingTitle) {
      await prisma.appliedTitle.update({
        where: { id: existingTitle.id },
        data: { title: body.data.newTitle },
      });
    } else {
      await prisma.appliedTitle.create({
        data: { userId: body.data.userId, title: body.data.newTitle },
      });
    }
  } else {
    // deny the request
    return new Response("Title not allowed to be applied to this user", {
      status: 403,
    });
  }

  return new Response("OK", { status: 200 });
}
