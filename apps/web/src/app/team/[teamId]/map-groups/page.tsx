import { MapGroupManager } from "@/components/compare/map-group-manager";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { auth } from "@/lib/auth";
import { getMetadataTranslations } from "@/lib/metadata-i18n";
import prisma from "@/lib/prisma";
import type { PagePropsWithLocale } from "@/types/next";
import { $Enums } from "@/generated/prisma/browser";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

export function generateMetadata(): Metadata {
  const t = getMetadataTranslations("mapGroupsPage.metadata");

  return {
    title: t("title"),
    description: t("description"),
  };
}

// Static shell: the page frame and heading prerender, and the auth-derived
// content streams into ONE boundary whose fallback mirrors MapGroupManager's
// own pending layout (card frame + centered loader).
export default function MapGroupsPage(
  props: PagePropsWithLocale<"/team/[teamId]/map-groups">
) {
  return (
    <DashboardLayout>
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Map Groups</h2>
        </div>
        <Suspense fallback={<MapGroupsSkeleton />}>
          <MapGroupsContent params={props.params} />
        </Suspense>
      </div>
    </DashboardLayout>
  );
}

async function MapGroupsContent({
  params,
}: {
  params: PagePropsWithLocale<"/team/[teamId]/map-groups">["params"];
}) {
  const { teamId: teamSlug } = await params;
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
  const teamId = parseInt(teamSlug);
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

  return <MapGroupManager teamId={teamId} availableMaps={availableMaps} />;
}

// Mirrors MapGroupManager's first paint: the card frame with header row
// (title, description, action button) and the centered pending indicator its
// client-side query shows, so the streamed content replaces this in place.
function MapGroupsSkeleton() {
  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="mt-2 h-4 w-72 max-w-full" />
          </div>
          <Skeleton className="h-8 w-28 rounded-md" />
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="flex items-center justify-center py-12">
          <Skeleton className="size-6 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}
