import { auth } from "@/lib/auth";
import Logger from "@/lib/logger";
import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const session = await auth();
  const authToken = req.headers.get("Authorization");

  const testingEmail = "lucas@lux.dev";

  if (!session) {
    if (authToken !== process.env.DEV_TOKEN) {
      Logger.warn("Unauthorized request to create team invite");
      return new Response("Unauthorized", { status: 401 });
    }
    Logger.log("Authorized request to create team invite using dev token");
  }

  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    Logger.error("No token provided to join team");
    return new Response("No token provided", { status: 400 });
  }

  const teamInviteToken = await prisma.teamInviteToken.findUnique({
    where: { token },
  });

  if (!teamInviteToken) {
    Logger.error("Invalid or expired token provided to join team");
    return new Response("Invalid token provided", { status: 400 });
  }

  await prisma.team.update({
    where: { id: teamInviteToken.teamId },
    data: {
      users: { connect: { email: session?.user?.email ?? testingEmail } },
    },
  });

  await prisma.teamInviteToken.delete({ where: { token } });

  Logger.log(
    `User ${session?.user?.email ?? testingEmail} joined team ${
      teamInviteToken.teamId
    }`
  );

  const teams = await prisma.team.findMany({
    where: { users: { some: { email: session?.user?.email ?? testingEmail } } },
  });

  Logger.log(`User now belongs to team: ${JSON.stringify(teams)}`);

  return new Response("OK", { status: 200 });
}
