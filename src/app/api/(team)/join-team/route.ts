import { auth } from "@/lib/auth";
import Logger from "@/lib/logger";
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  const authToken = req.headers.get("Authorization");

  const testingEmail = "lucas@lux.dev";

  if (!session) {
    if (authToken !== process.env.DEV_TOKEN) {
      Logger.warn("Unauthorized request to create team invite");
      return new Response("Unauthorized", {
        status: 401,
      });
    } else {
      Logger.log("Authorized request to create team invite using dev token");
    }
  }

  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    Logger.error("No token provided to join team");
    return new Response("No token provided", {
      status: 400,
    });
  }

  const teamInviteToken = await prisma.teamInviteToken.findUnique({
    where: {
      token,
    },
  });

  if (!teamInviteToken) {
    Logger.error("Invalid or expired token provided to join team");
    return new Response("Invalid token provided", {
      status: 400,
    });
  }

  if (teamInviteToken.email !== (session?.user?.email ?? testingEmail)) {
    Logger.error(
      `User ${session?.user?.id} tried to join team ${teamInviteToken.teamId} with a token that doesn't belong to them`
    );
    return new Response("Unauthorized to join team", {
      status: 400,
    });
  }

  await prisma.team.update({
    where: {
      id: teamInviteToken.teamId,
    },
    data: {
      users: {
        connect: {
          email: session?.user?.email ?? testingEmail,
        },
      },
    },
  });

  await prisma.teamInviteToken.delete({
    where: {
      token,
    },
  });

  Logger.log(
    `User ${session?.user?.id ?? testingEmail} joined team ${
      teamInviteToken.teamId
    }`
  );

  const teams = await prisma.team.findMany({
    where: {
      users: {
        some: {
          email: session?.user?.email ?? testingEmail,
        },
      },
    },
  });

  Logger.log("User now belongs to team: " + JSON.stringify(teams));

  return new Response("OK", {
    status: 200,
  });
}
