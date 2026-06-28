import { auth } from "@/lib/auth";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import type { PagePropsWithLocale } from "@/types/next";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { JoinTokenSkeleton } from "./loading-skeleton";

export default function TokenPage(
  props: PagePropsWithLocale<"/team/join/[token]">
) {
  return (
    <Suspense fallback={<JoinTokenSkeleton />}>
      <TokenPageContent params={props.params} />
    </Suspense>
  );
}

async function TokenPageContent({
  params: paramsPromise,
}: {
  params: PagePropsWithLocale<"/team/join/[token]">["params"];
}): Promise<ReactNode> {
  // Every path ends in redirect() (typed `never`), so the function never
  // actually returns a node — the annotation just lets it satisfy JSX typing.
  const params = await paramsPromise;
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
