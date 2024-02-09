import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { User } from "@prisma/client";
import { NextRequest } from "next/server";

type RemoveUserFromTeamBody = {
  userId: string;
  teamId: string;
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !session.user || !session.user.email) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }

  const body = (await req.json()) as RemoveUserFromTeamBody;

  const team = await prisma.team.findFirst({
    where: {
      id: parseInt(body.teamId),
    },
  });

  if (!team) {
    return new Response("Team not found", {
      status: 404,
    });
  }

  const user = await prisma.user.findFirst({
    where: {
      id: body.userId,
    },
  });

  if (!user) {
    return new Response("User not found", {
      status: 404,
    });
  }

  const authedUser = await prisma.user.findFirst({
    where: {
      email: session.user.email,
    },
  });

  if (!authedUser) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }

  const managers = await prisma.team.findFirst({
    where: {
      id: parseInt(body.teamId),
    },
    select: {
      managers: {
        select: {
          userId: true,
        },
      },
    },
  });

  const authedUserIsManager = managers?.managers.some(
    (manager) => manager.userId === authedUser.id
  );

  function userIsManager(user: User) {
    return managers?.managers.some((manager) => manager.userId === user.id);
  }

  if (team.ownerId !== authedUser.id && !authedUserIsManager) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }

  if (team.ownerId === user.id) {
    return new Response("Cannot remove owner from team", {
      status: 400,
    });
  }

  if (authedUserIsManager && user.id === authedUser.id) {
    return new Response("Cannot remove yourself from team", {
      status: 400,
    });
  }

  if (authedUserIsManager && userIsManager(user)) {
    return new Response("Cannot remove another manager", {
      status: 400,
    });
  }

  if (team.ownerId === authedUser.id) {
    if (userIsManager(user)) {
      await prisma.teamManager.deleteMany({
        where: {
          userId: user.id,
          teamId: parseInt(body.teamId),
        },
      });
    }
  }

  await prisma.team.update({
    where: {
      id: parseInt(body.teamId),
    },
    data: {
      users: {
        disconnect: {
          id: body.userId,
        },
      },
    },
  });

  return new Response("OK", {
    status: 200,
  });
}
