import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { $Enums } from "@prisma/client";

type UpdateNameBody = {
  name: string;
  scrimId: number;
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !session.user || !session.user.email) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }

  const body = (await req.json()) as UpdateNameBody;

  const user = await prisma.user.findFirst({
    where: {
      email: session.user.email,
    },
  });

  if (!user) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }

  const userIsManager = await prisma.team.findFirst({
    where: {
      id: user.teamId ?? 0,
      managers: {
        some: {
          userId: user.id,
        },
      },
    },
  });

  const scrim = await prisma.scrim.findFirst({
    where: {
      id: body.scrimId,
    },
  });

  if (!scrim) {
    return new Response("Scrim not found", {
      status: 404,
    });
  }

  const hasPerms =
    userIsManager || // user is a manager of the team
    user.id === scrim.creatorId || // user created the scrim
    user.role === $Enums.UserRole.ADMIN || // user is an admin
    user.role === $Enums.UserRole.MANAGER; // user is a manager

  if (!hasPerms) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }

  await prisma.scrim.update({
    where: {
      id: body.scrimId,
    },
    data: {
      name: body.name,
    },
  });

  return new Response("OK", {
    status: 200,
  });
}
