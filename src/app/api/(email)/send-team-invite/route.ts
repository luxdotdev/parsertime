import TeamInviteUserEmail from "@/components/email/team-invite";
import { getUser } from "@/data/user-dto";
import { auditLog } from "@/lib/audit-logs";
import { email } from "@/lib/email";
import { createShortLink } from "@/lib/link-service";
import { notifications } from "@/lib/notifications";
import prisma from "@/lib/prisma";
import { render } from "@react-email/render";
import { track } from "@vercel/analytics/server";
import type { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const inviteeEmail = req.nextUrl.searchParams.get("email");
  const inviteToken = req.nextUrl.searchParams.get("token");

  const baseUrl =
    process.env.NODE_ENV === "production"
      ? "https://parsertime.app"
      : "http://localhost:3000";

  if (!inviteeEmail || !inviteToken) {
    return new Response("Missing email or token", { status: 400 });
  }

  const teamInviteToken = await prisma.teamInviteToken.findFirst({
    where: { token: inviteToken },
  });
  if (!teamInviteToken) return new Response("Token not found", { status: 404 });

  const inviter = await getUser(teamInviteToken?.email);
  if (!inviter) return new Response("Inviter not found", { status: 404 });

  const team = await prisma.team.findFirst({
    where: { id: teamInviteToken.teamId },
  });
  if (!team) return new Response("Team not found", { status: 404 });

  const user = await getUser(inviteeEmail);
  if (!user) return new Response("User not found", { status: 404 });

  const shortLink = await createShortLink(
    `${baseUrl}/team/join/${inviteToken}`
  );

  const emailHtml = await render(
    TeamInviteUserEmail({
      username: inviteeEmail,
      userImage: user.image ?? `https://avatar.vercel.sh/${user.name}.png`,
      invitedByUsername: inviter.name ?? "Unknown",
      invitedByEmail: inviter.email ?? "Unknown",
      teamName: team.name ?? "Unknown",
      teamImage: team.image ?? `https://avatar.vercel.sh/${team.name}.png`,
      inviteLink: shortLink,
    })
  );

  await Promise.all([
    notifications.createInAppNotification({
      userId: user.id,
      title: `You've been invited to join ${team.name} on Parsertime`,
      description: `You've been invited to join ${team.name} on Parsertime by ${inviter.name}. Click this notification to accept the invitation.`,
      href: `/team/join/${inviteToken}`,
    }),
    auditLog.createAuditLog({
      adminName: inviter.email,
      action: "TEAM_INVITE_SENT",
      target: inviteeEmail,
      details: `Invited ${inviteeEmail} to join ${team.name}`,
    }),
  ]);

  try {
    await email.sendEmail({
      to: inviteeEmail,
      from: "noreply@lux.dev",
      subject: `Join ${team.name} on Parsertime`,
      html: emailHtml,
    });
  } catch {
    return new Response("Error sending email", { status: 500 });
  }

  await track("Email Sent", { type: "Team Invite" });

  await track("Team Invite Sent", {
    user: inviter.email,
    team: team.name,
    invitee: inviteeEmail,
  });

  return new Response("OK", { status: 200 });
}
