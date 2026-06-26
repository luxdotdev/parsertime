import TeamInviteUserEmail from "@parsertime/transactional/emails/team-invite";
import { auditLog } from "@/lib/audit-logs";
import { canManageTeam, getCurrentUser } from "@/lib/auth";
import { email } from "@/lib/email";
import { createShortLink } from "@/lib/link-service";
import { Logger } from "@/lib/logger";
import { notifications } from "@/lib/notifications";
import prisma from "@/lib/prisma";
import { isTaggedError } from "@/lib/utils";
import { render } from "@react-email/render";
import { track } from "@vercel/analytics/server";
import { unauthorized } from "next/navigation";
import { after, type NextRequest } from "next/server";
import { z } from "zod";

const SendInviteSchema = z.object({
  email: z.email().max(254),
  token: z.string().min(1).max(128),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) unauthorized();

  const parsed = SendInviteSchema.safeParse({
    email: req.nextUrl.searchParams.get("email"),
    token: req.nextUrl.searchParams.get("token"),
  });
  if (!parsed.success) {
    return new Response("Invalid request", { status: 400 });
  }

  const { email: inviteeEmail, token: inviteToken } = parsed.data;
  const normalizedInviteeEmail = inviteeEmail.toLowerCase();

  const baseUrl =
    process.env.NODE_ENV === "production"
      ? "https://parsertime.app"
      : "http://localhost:3000";

  const teamInviteToken = await prisma.teamInviteToken.findUnique({
    where: { token: inviteToken },
    select: { email: true, expires: true, teamId: true },
  });
  if (!teamInviteToken) return new Response("Invalid invite", { status: 404 });
  if (teamInviteToken.expires <= new Date()) {
    return new Response("Invite expired", { status: 410 });
  }
  if (teamInviteToken.email.toLowerCase() !== normalizedInviteeEmail) {
    return new Response("Forbidden", { status: 403 });
  }
  if (!(await canManageTeam(teamInviteToken.teamId, user))) {
    return new Response("Forbidden", { status: 403 });
  }

  const team = await prisma.team.findFirst({
    where: { id: teamInviteToken.teamId },
  });
  if (!team) return new Response("Team not found", { status: 404 });

  const invitee = await prisma.user.findUnique({
    where: { email: normalizedInviteeEmail },
    select: { id: true, image: true, name: true },
  });

  const shortLink = await createShortLink(
    `${baseUrl}/team/join/${inviteToken}`
  );

  // Avatar/team images are stored as relative proxy paths; email clients need
  // absolute URLs, so prefix the site origin when the value is a local path.
  function toAbsolute(value: string): string {
    return value.startsWith("/") ? `${baseUrl}${value}` : value;
  }

  const emailHtml = await render(
    TeamInviteUserEmail({
      username: inviteeEmail,
      userImage: invitee?.image
        ? toAbsolute(invitee.image)
        : `https://avatar.vercel.sh/${normalizedInviteeEmail}.png`,
      invitedByUsername: user.name ?? "Unknown",
      invitedByEmail: user.email ?? "Unknown",
      teamName: team.name ?? "Unknown",
      teamImage: team.image
        ? toAbsolute(team.image)
        : `https://avatar.vercel.sh/${team.name}.png`,
      inviteLink: shortLink,
    })
  );

  if (invitee) {
    try {
      await notifications.createInAppNotification({
        userId: invitee.id,
        title: `You've been invited to join ${team.name} on Parsertime`,
        description: `You've been invited to join ${team.name} by ${user.name}. Click this notification to accept the invitation.`,
        href: `/team/join/${inviteToken}`,
      });
    } catch (error) {
      if (error && typeof error === "object" && "_tag" in error) {
        Logger.error("Error creating in-app notification", error._tag);
      }
      // fail silently, just log the error as notifications are not critical
    }
  }

  try {
    await email.sendEmail({
      to: inviteeEmail,
      from: "noreply@lux.dev",
      subject: `Join ${team.name} on Parsertime`,
      html: emailHtml,
    });
  } catch (error) {
    if (isTaggedError(error)) {
      switch (error._tag) {
        case "ValidationError":
          return new Response("Invalid email arguments", { status: 400 });
        case "ConfigurationError":
          return new Response(
            "Configuration error with email service. Please contact support.",
            { status: 500 }
          );
        case "RateLimitError":
          return new Response(
            "Rate limit exceeded for sending email. Try again later.",
            { status: 429 }
          );
        case "EmailSendError":
          return new Response(
            "Error sending email with email service. Please contact support.",
            { status: 500 }
          );
        default:
          return new Response(
            "Unknown error sending email. Please contact support.",
            { status: 500 }
          );
      }
    }

    return new Response(
      "Unknown error sending email. Please contact support.",
      { status: 500 }
    );
  }

  after(async () => {
    await Promise.all([
      auditLog.createAuditLog({
        userEmail: user.email,
        action: "TEAM_INVITE_SENT",
        target: inviteeEmail,
        details: `Invited ${inviteeEmail} to join ${team.name}`,
      }),
      track("Team Invite Sent", {
        user: user.email,
        team: team.name,
        invitee: inviteeEmail,
      }),
      track("Email Sent", { type: "Team Invite" }),
    ]);
  });

  return new Response("OK", { status: 200 });
}
