import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { $Enums } from "@prisma/client";
import { getUser } from "@/data/user-dto";
import { getScrim } from "@/data/scrim-dto";

type UpdateScrimBody = {
  name: string;
  teamId: string;
  scrimId: number;
  guestMode: boolean;
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !session.user || !session.user.email) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }

  const body = (await req.json()) as UpdateScrimBody;

  const user = await getUser(session.user.email);

  if (!user) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }

  const userIsManager = await prisma.teamManager.findFirst({
    where: {
      userId: user.id,
    },
  });

  const scrim = await getScrim(body.scrimId);

  if (!scrim) {
    return new Response("Scrim not found", {
      status: 404,
    });
  }

  const hasPerms =
    userIsManager !== null || // user is a manager of the team
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
      teamId: parseInt(body.teamId),
      guestMode: body.guestMode,
    },
  });

  return new Response("OK", {
    status: 200,
  });
}
