import { auth } from "@/lib/auth";
import Logger from "@/lib/logger";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function TokenPage({
  params,
}: {
  params: { token: string };
}) {
  const session = await auth();
  const token = params.token;

  if (!session) {
    redirect("/login");
  }

  const teamInviteToken = await prisma.teamInviteToken.findUnique({
    where: {
      token,
    },
  });

  if (!teamInviteToken) {
    Logger.error("Invalid or expired token provided to join team");
    redirect("/team/join?error=invalid-token");
  }

  if (teamInviteToken.email !== session.user?.email) {
    Logger.error(
      `User ${session?.user?.email} tried to join team ${teamInviteToken.teamId} with a token that doesn't belong to them`
    );
    redirect("/team/join?error=invalid-token");
  }

  await prisma.team.update({
    where: {
      id: teamInviteToken.teamId,
    },
    data: {
      users: {
        connect: {
          email: session.user.email,
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
    `User ${session.user.email} joined team ${teamInviteToken.teamId}`
  );

  const teams = await prisma.team.findMany({
    where: {
      users: {
        some: {
          email: session?.user?.email,
        },
      },
    },
  });

  Logger.log("User now belongs to team: " + JSON.stringify(teams));
  redirect("/team/join/success");
}
