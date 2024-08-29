import { auth } from "@/lib/auth";
import Logger from "@/lib/logger";
import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";
import { z } from "zod";

const AvatarUpdateSchema = z.object({
  userId: z.string().min(1),
  image: z.string().url(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !session.user) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }

  const body = AvatarUpdateSchema.safeParse(await req.json());
  if (!body.success) {
    return new Response("Invalid request", {
      status: 400,
    });
  }

  const user = await prisma.user.findUnique({
    where: {
      id: body.data.userId,
    },
  });

  if (!user) {
    return new Response("Not found", {
      status: 404,
    });
  }

  if (user.email !== session.user.email) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      image: body.data.image,
    },
  });

  Logger.log("new avatar uploaded for user: ", user.email, body.data.image);

  return new Response("OK", {
    status: 200,
  });
}
