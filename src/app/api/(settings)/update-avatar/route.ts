import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import Logger from "@/lib/logger";

type AvatarUpdateBody = {
  userId: string;
  image: string;
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !session.user) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }

  const body = (await req.json()) as AvatarUpdateBody;

  const user = await prisma.user.findUnique({
    where: {
      id: body.userId,
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
      image: body.image,
    },
  });

  Logger.log("new avatar uploaded for user: ", user.email, body.image);

  return new Response("OK", {
    status: 200,
  });
}
