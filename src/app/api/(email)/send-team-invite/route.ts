import TeamInviteUserEmail from "@/components/email/team-invite";
import { render } from "@react-email/render";
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const inviteeEmail = req.nextUrl.searchParams.get("email");
  const inviteToken = req.nextUrl.searchParams.get("token");

  const baseUrl =
    process.env.NODE_ENV === "production"
      ? "https://parsertime.app"
      : "http://localhost:3000";

  if (!inviteeEmail || !inviteToken) {
    return new Response("Missing email or token", {
      status: 400,
    });
  }

  const teamInviteToken = await prisma.teamInviteToken.findFirst({
    where: {
      token: inviteToken,
    },
  });

  if (!teamInviteToken) {
    return new Response("Token not found", {
      status: 404,
    });
  }

  const inviter = await prisma.user.findFirst({
    where: {
      email: teamInviteToken?.email,
    },
  });

  if (!inviter) {
    return new Response("Inviter not found", {
      status: 404,
    });
  }

  const team = await prisma.team.findFirst({
    where: {
      id: teamInviteToken.teamId,
    },
  });

  if (!team) {
    return new Response("Team not found", {
      status: 404,
    });
  }

  const user = await prisma.user.findFirst({
    where: {
      email: inviteeEmail,
    },
  });

  if (!user) {
    return new Response("User not found", {
      status: 404,
    });
  }

  const emailHtml = render(
    TeamInviteUserEmail({
      username: inviteeEmail,
      userImage: user.image ?? `https://avatar.vercel.sh/${user.name}.png`,
      invitedByUsername: inviter.name ?? "Unknown",
      invitedByEmail: inviter.email ?? "Unknown",
      teamName: team.name ?? "Unknown",
      teamImage: team.image ?? `https://avatar.vercel.sh/${team.name}.png`,
      inviteLink: `${baseUrl}/team/join/${inviteToken}`,
    })
  );

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    body: JSON.stringify({
      personalizations: [{ to: [{ email: inviteeEmail }] }],
      from: { email: "noreply@lux.dev" },
      subject: `Join ${team.name} on Parsertime`,
      content: [
        {
          type: "text/html",
          value: emailHtml,
        },
      ],
    }),
    headers: {
      Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    const { errors } = (await response.json()) as { errors: string[] };
    throw new Error(JSON.stringify(errors));
  }

  return new Response("OK", {
    status: 200,
  });
}
