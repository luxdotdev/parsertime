import { auth, canManageTeam, getCurrentUser } from "@/lib/auth";
import { generateRandomToken } from "@/lib/invite-token";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { TEAM_MEMBER_LIMIT } from "@/lib/usage";
import { unauthorized } from "next/navigation";
import type { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.email) {
    Logger.warn("Unauthorized request to create team invite");
    unauthorized();
  }

  const teamId = req.nextUrl.searchParams.get("id")
    ? parseInt(req.nextUrl.searchParams.get("id")!)
    : null;

  if (!teamId) {
    Logger.error("No team id provided to create team invite");
    return new Response("No team id provided", { status: 400 });
  }

  const teamData = await prisma.team.findFirst({
    where: { id: teamId },
    select: { users: true, ownerId: true },
  });
  if (!teamData) return new Response("Team not found", { status: 404 });

  const user = await getCurrentUser();
  if (!(await canManageTeam(teamId, user))) {
    return new Response("Forbidden", { status: 403 });
  }

  const teamCreator = await prisma.user.findFirst({
    where: { id: teamData.ownerId },
  });

  if (!teamCreator)
    return new Response("Team creator not found", { status: 404 });

  const numberOfMembers = teamData.users.length ?? 0;

  switch (teamCreator.billingPlan) {
    case "FREE":
      if (numberOfMembers >= TEAM_MEMBER_LIMIT[teamCreator.billingPlan]) {
        return new Response(
          "You have hit the limit of members that can be invited to this team.  Please upgrade your plan or contact support.",
          {
            status: 403,
          }
        );
      }
      break;
    case "BASIC":
      if (numberOfMembers >= TEAM_MEMBER_LIMIT[teamCreator.billingPlan]) {
        return new Response(
          "You have hit the limit of members that can be invited to this team.  Please upgrade your plan or contact support.",
          {
            status: 403,
          }
        );
      }
      break;
    case "PREMIUM":
      if (numberOfMembers >= TEAM_MEMBER_LIMIT[teamCreator.billingPlan]) {
        return new Response(
          "You have hit the limit of members that can be invited to this team.  Please upgrade your plan or contact support.",
          {
            status: 403,
          }
        );
      }
      break;
    default:
      if (teamCreator.role !== "ADMIN") unauthorized();
      break;
  }

  const inviteToken = generateRandomToken();
  const expiresAt = new Date().getTime() + 1000 * 60 * 60 * 24 * 7; // 7 days

  await prisma.teamInviteToken.create({
    data: {
      token: inviteToken,
      teamId,
      email: session.user.email,
      expires: new Date(expiresAt),
    },
  });

  return new Response(JSON.stringify({ token: inviteToken }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
