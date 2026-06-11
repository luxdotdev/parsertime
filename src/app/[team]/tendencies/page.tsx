import { DashboardLayout } from "@/components/dashboard-layout";
import { FightMapContent } from "@/components/team/fight-map-content";
import { AppRuntime } from "@/data/runtime";
import { FightFieldService } from "@/data/team/fight-field-service";
import { UserService } from "@/data/user";
import { auth } from "@/lib/auth";
import { loadCalibration } from "@/lib/map-calibration/load-calibration";
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

  const views = await AppRuntime.runPromise(
    FightFieldService.pipe(Effect.flatMap((svc) => svc.getFightFields(teamId)))
  );

  // Presigned map images + transforms per view. Control sub-maps carry
  // their own calibration names ("Busan: Downtown"), which is exactly what
  // each view's mapName holds, so control maps get imagery for free.
  const calibrationEntries = await Promise.all(
    views.map(
      async (view) =>
        [view.mapName, await loadCalibration(view.mapName)] as const
    )
  );
  const calibrations = Object.fromEntries(calibrationEntries);

  return (
    <DashboardLayout>
      <FightMapContent views={views} calibrations={calibrations} />
    </DashboardLayout>
  );
}
