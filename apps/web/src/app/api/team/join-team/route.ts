import { auditLog } from "@/lib/audit-logs";
import { auth } from "@/lib/auth";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import {
  maskEmail,
  type RedeemTeamInviteFailure,
} from "@/lib/redeem-team-invite";
import { unauthorized } from "next/navigation";
import { after, type NextRequest } from "next/server";

type RedeemOutcome =
  | { ok: true; team: { id: number; name: string } }
  | { ok: false; reason: "invalid" | "expired" }
  | { ok: false; reason: "email_mismatch"; invitedEmail: string };

const FAILURE_STATUS: Record<RedeemTeamInviteFailure["reason"], number> = {
  unauthorized: 401,
  invalid: 404,
  expired: 410,
  email_mismatch: 403,
  error: 500,
};

function failure(body: RedeemTeamInviteFailure): Response {
  return Response.json(body, { status: FAILURE_STATUS[body.reason] });
}

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.email) {
    Logger.warn("Unauthorized request to join team");
    unauthorized();
  }

  const token = req.nextUrl.searchParams.get("token");
  const userEmail = session.user.email.toLowerCase();

  if (!token) {
    Logger.error("No token provided to join team");
    return failure({ reason: "invalid" });
  }

  const outcome = await prisma.$transaction(
    async (tx): Promise<RedeemOutcome> => {
      const teamInviteToken = await tx.teamInviteToken.findUnique({
        where: { token },
      });

      if (!teamInviteToken) return { ok: false, reason: "invalid" };
      if (teamInviteToken.expires <= new Date()) {
        return { ok: false, reason: "expired" };
      }
      if (teamInviteToken.email.toLowerCase() !== userEmail) {
        return {
          ok: false,
          reason: "email_mismatch",
          invitedEmail: teamInviteToken.email,
        };
      }

      const deleted = await tx.teamInviteToken.deleteMany({
        where: { token, expires: { gt: new Date() } },
      });
      // Someone else redeemed it between our read and delete.
      if (deleted.count !== 1) return { ok: false, reason: "invalid" };

      const team = await tx.team.update({
        where: { id: teamInviteToken.teamId },
        data: {
          users: { connect: { email: userEmail } },
        },
        select: { id: true, name: true },
      });
      return { ok: true, team };
    }
  );

  if (!outcome.ok) {
    if (outcome.reason === "email_mismatch") {
      // Full addresses stay server-side so support can see exactly which
      // account the invitee was signed in as; the response only gets a mask.
      Logger.error("Team invite email mismatch", {
        invitedEmail: outcome.invitedEmail,
        sessionEmail: session.user.email,
      });
      return failure({
        reason: "email_mismatch",
        invitedEmail: maskEmail(outcome.invitedEmail),
        currentEmail: session.user.email,
      });
    }

    Logger.error(
      `${outcome.reason === "expired" ? "Expired" : "Invalid"} token provided to join team`,
      { sessionEmail: session.user.email }
    );
    return failure({ reason: outcome.reason });
  }

  const joinedTeam = outcome.team;
  Logger.info(`User ${session.user.email} joined team ${joinedTeam.id}`);

  after(async () => {
    await auditLog.createAuditLog({
      userEmail: session.user.email,
      action: "TEAM_JOINED",
      target: `${joinedTeam.name}`,
      details: `Joined team ${joinedTeam.name} (Team ID: ${joinedTeam.id})`,
    });
  });

  return new Response("OK", { status: 200 });
}
