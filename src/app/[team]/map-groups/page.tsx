import { MapGroupManager } from "@/components/compare/map-group-manager";
import { DashboardLayout } from "@/components/dashboard-layout";
import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { PagePropsWithLocale } from "@/types/next";
import { $Enums } from "@prisma/client";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

export async function generateMetadata(
  props: PagePropsWithLocale<"/[team]/map-groups">
): Promise<Metadata> {
  const params = await props.params;
  const t = await getTranslations({
    locale: params.locale,
    namespace: "mapGroupsPage.metadata",
  });

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function MapGroupsPage(
  props: PagePropsWithLocale<"/[team]/map-groups">
) {
  const params = await props.params;
  const session = await auth();

  if (!session?.user?.email) {
    notFound();
  }

  const user = await getUser(session.user.email);
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

  // Fetch all maps for this team (via Scrim relationship)
  const maps = await prisma.map.findMany({
    where: {
      Scrim: {
        teamId,
      },
    },
    include: {
      Scrim: {
        select: {
          id: true,
          name: true,
          date: true,
        },
      },
    },
    orderBy: [{ Scrim: { date: "desc" } }, { id: "asc" }],
  });

  const availableMaps = maps
    .filter((map) => map.Scrim !== null)
    .map((map) => ({
      id: map.id,
      name: map.name,
      scrimName: map.Scrim!.name,
      scrimDate: map.Scrim!.date,
    }));

  return (
    <DashboardLayout>
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Map Groups</h2>
        </div>
        <MapGroupManager teamId={teamId} availableMaps={availableMaps} />
      </div>
    </DashboardLayout>
  );
}
