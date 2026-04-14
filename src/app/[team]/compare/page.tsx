import { ComparisonContent } from "@/components/compare/comparison-content";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { PagePropsWithLocale } from "@/types/next";
import { $Enums } from "@prisma/client";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

export async function generateMetadata(
  props: PagePropsWithLocale<"/[team]/compare">
): Promise<Metadata> {
  const params = await props.params;
  const t = await getTranslations({
    locale: params.locale,
    namespace: "comparePage.metadata",
  });

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function ComparePage(
  props: PagePropsWithLocale<"/[team]/compare">
) {
  const params = await props.params;
  const session = await auth();

  if (!session?.user?.email) {
    notFound();
  }

  const user = await AppRuntime.runPromise(
    UserService.pipe(Effect.flatMap((svc) => svc.getUser(session.user.email)))
  );
  if (!user) {
    notFound();
  }

  // Extract team ID from team slug
  const teamId = parseInt(params.team);
  if (isNaN(teamId)) {
    notFound();
  }

  // Verify user has access to this team — only fetch user IDs, not full objects
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      users: { select: { id: true } },
    },
  });

  if (
    user.role !== $Enums.UserRole.ADMIN &&
    (!team || !team.users.some((teamUser) => teamUser.id === user.id))
  ) {
    notFound();
  }

  return (
    <DashboardLayout>
      <ComparisonContent teamId={teamId} locale={params.locale} />
    </DashboardLayout>
  );
}
