import { auth } from "@/lib/auth";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import type { PagePropsWithLocale } from "@/types/next";
import { redirect } from "next/navigation";

export default async function TokenPage(
  props: PagePropsWithLocale<"/team/join/[token]">
) {
  const params = await props.params;
  const session = await auth();
  const token = params.token;

  if (!session?.user?.email)
    redirect(`/sign-in?callbackUrl=/team/join/${token}`);

  const userEmail = session.user.email.toLowerCase();

  const joinedTeam = await prisma.$transaction(async (tx) => {
    const teamInviteToken = await tx.teamInviteToken.findUnique({
      where: { token },
    });

    if (!teamInviteToken || teamInviteToken.expires <= new Date()) return null;
    if (teamInviteToken.email.toLowerCase() !== userEmail) return null;

    const deleted = await tx.teamInviteToken.deleteMany({
      where: { token, expires: { gt: new Date() } },
    });
    if (deleted.count !== 1) return null;

    return await tx.team.update({
      where: { id: teamInviteToken.teamId },
      data: { users: { connect: { email: userEmail } } },
      select: { id: true },
    });
  });

  if (!joinedTeam) {
    Logger.error("Invalid or expired token provided to join team");
    redirect("/team/join?error=invalid-token");
  }

  Logger.info(`User ${session.user.email} joined team ${joinedTeam.id}`);
  redirect("/team/join/success");
}
