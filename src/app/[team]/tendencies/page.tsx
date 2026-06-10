import { DashboardLayout } from "@/components/dashboard-layout";
import { TendenciesContent } from "@/components/team/tendencies-content";
import { AppRuntime } from "@/data/runtime";
import { RouteTendenciesService } from "@/data/team/route-tendencies-service";
import { UserService } from "@/data/user";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { PagePropsWithLocale } from "@/types/next";
import { $Enums } from "@prisma/client";
import { Effect } from "effect";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

export async function generateMetadata(
  props: PagePropsWithLocale<"/[team]/tendencies">
): Promise<Metadata> {
  const params = await props.params;
  const t = await getTranslations({
    locale: params.locale,
    namespace: "tendenciesPage.metadata",
  });

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function TendenciesPage(
  props: PagePropsWithLocale<"/[team]/tendencies">
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

  // Verify user has access to this team
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      users: true,
    },
  });

  if (
    user.role !== $Enums.UserRole.ADMIN &&
    (!team || !team.users.some((teamUser) => teamUser.id === user.id))
  ) {
    notFound();
  }

  const tendencies = await AppRuntime.runPromise(
    RouteTendenciesService.pipe(
      Effect.flatMap((svc) => svc.getTendencies(teamId))
    )
  );

  const t = await getTranslations({
    locale: params.locale,
    namespace: "tendenciesPage",
  });

  return (
    <DashboardLayout>
      <TendenciesContent
        tendencies={tendencies}
        labels={{
          title: t("title"),
          description: t("description"),
          empty: t("empty"),
          totalRoutes: t("totalRoutes"),
          route: t("route"),
          share: t("share"),
          routeColumn: t("routeColumn"),
          outcomes: t("outcomes"),
          won: t("won"),
          lost: t("lost"),
          unknown: t("unknown"),
        }}
      />
    </DashboardLayout>
  );
}
