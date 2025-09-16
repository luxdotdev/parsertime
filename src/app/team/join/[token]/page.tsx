import { auth } from "@/lib/auth";
import Logger from "@/lib/logger";
import prisma from "@/lib/prisma";
import { PagePropsWithLocale } from "@/types/next";
import { redirect } from "next/navigation";

export default async function TokenPage(
  props: PagePropsWithLocale<"/team/join/[token]">
) {
  const params = await props.params;
  const session = await auth();
  const token = params.token;

  if (!session) redirect("/sign-in");

  try {
    const teamCreatedAt = new Date(atob(token));

    const team = await prisma.team.findFirst({
      where: { createdAt: teamCreatedAt },
    });

    if (!team) {
      Logger.error("Team not found for date token");
      redirect("/team/join?error=invalid-token");
    }

    await prisma.team.update({
      where: { id: team.id },
      data: { users: { connect: { email: session?.user?.email ?? "" } } },
    });

    Logger.log(`User now belongs to team: ${JSON.stringify(team)}`);
  } catch (e) {
    const teamInviteToken = await prisma.teamInviteToken.findUnique({
      where: { token },
    });

    if (!teamInviteToken) {
      Logger.error("Invalid or expired token provided to join team");
      redirect("/team/join?error=invalid-token");
    }

    await prisma.team.update({
      where: { id: teamInviteToken.teamId },
      data: { users: { connect: { email: session?.user?.email ?? "" } } },
    });

    await prisma.teamInviteToken.delete({ where: { token } });

    Logger.log(
      `User ${session?.user?.email} joined team ${teamInviteToken.teamId}`
    );

    const teams = await prisma.team.findMany({
      where: { users: { some: { email: session?.user?.email } } },
    });

    Logger.log(`User now belongs to team: ${JSON.stringify(teams)}`);
    redirect("/team/join/success");
  }

  redirect("/team/join/success");
}
