import { auth } from "@/lib/auth";
import { generateRandomToken } from "@/lib/invite-token";
import Logger from "@/lib/logger";
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  const token = req.headers.get("Authorization");

  const testingEmail = "lucas@lux.dev";

  if (!session) {
    if (token !== process.env.DEV_TOKEN) {
      Logger.warn("Unauthorized request to create team invite");
      return new Response("Unauthorized", {
        status: 401,
      });
    } else {
      Logger.log("Authorized request to create team invite using dev token");
    }
  }

  const teamId = req.nextUrl.searchParams.get("id")
    ? parseInt(req.nextUrl.searchParams.get("id") as string)
    : null;

  if (!teamId) {
    Logger.error("No team id provided to create team invite");
    return new Response("No team id provided", {
      status: 400,
    });
  }

  const inviteToken = generateRandomToken();
  const expiresAt = new Date().getTime() + 1000 * 60 * 60 * 24 * 7; // 7 days

  await prisma.teamInviteToken.create({
    data: {
      token: inviteToken,
      teamId,
      email: session?.user?.email ?? testingEmail,
      expires: new Date(expiresAt),
    },
  });

  return new Response("OK", {
    status: 200,
  });
}
