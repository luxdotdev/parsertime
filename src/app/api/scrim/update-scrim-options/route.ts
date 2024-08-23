import { getScrim } from "@/data/scrim-dto";
import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { $Enums } from "@prisma/client";
import { NextRequest } from "next/server";
import { z } from "zod";

const UpdateScrimSchema = z.object({
  name: z.string().min(1).max(30),
  teamId: z.string().min(1),
  scrimId: z.number(),
  date: z.string().datetime(),
  guestMode: z.boolean(),
  maps: z.array(
    z.object({
      id: z.number(),
      replayCode: z.string().max(6).optional(),
    })
  ),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !session.user || !session.user.email) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }

  const body = UpdateScrimSchema.safeParse(await req.json());
  if (!body.success) {
    return new Response("Invalid request", {
      status: 400,
    });
  }

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

  const scrim = await getScrim(body.data.scrimId);

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
      id: body.data.scrimId,
    },
    data: {
      name: body.data.name,
      teamId: parseInt(body.data.teamId),
      date: new Date(body.data.date),
      guestMode: body.data.guestMode,
    },
  });

  if (body.data.maps && body.data.maps.length > 0) {
    for (const mapUpdate of body.data.maps) {
      await prisma.map.update({
        where: {
          id: mapUpdate.id,
        },
        data: {
          replayCode: mapUpdate.replayCode,
        },
      });
    }
  }

  return new Response("OK", {
    status: 200,
  });
}
