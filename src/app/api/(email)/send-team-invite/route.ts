import TeamInviteUserEmail from "@/components/email/team-invite";
import { getUser } from "@/data/user-dto";
import { auditLog } from "@/lib/audit-logs";
import { email } from "@/lib/email";
import { createShortLink } from "@/lib/link-service";
import { Logger } from "@/lib/logger";
import { notifications } from "@/lib/notifications";
import prisma from "@/lib/prisma";
import { isTaggedError } from "@/lib/utils";
import { render } from "@react-email/render";
import { track } from "@vercel/analytics/server";
import { checkBotId } from "botid/server";
import { after, type NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const verification = await checkBotId();
  if (verification.isBot) {
    return new Response("Access denied", { status: 403 });
  }

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

  try {
    await notifications.createInAppNotification({
      userId: user.id,
      title: `You've been invited to join ${team.name} on Parsertime`,
      description: `You've been invited to join ${team.name} by ${inviter.name}. Click this notification to accept the invitation.`,
      href: `/team/join/${inviteToken}`,
    });
  } catch (error) {
    if (error && typeof error === "object" && "_tag" in error) {
      Logger.error("Error creating in-app notification", error._tag);
    }
    // fail silently, just log the error as notifications are not critical
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
        userEmail: inviter.email,
        action: "TEAM_INVITE_SENT",
        target: inviteeEmail,
        details: `Invited ${inviteeEmail} to join ${team.name}`,
      }),
      track("Team Invite Sent", {
        user: inviter.email,
        team: team.name,
        invitee: inviteeEmail,
      }),
      track("Email Sent", { type: "Team Invite" }),
    ]);
  });

  return new Response("OK", { status: 200 });
}
