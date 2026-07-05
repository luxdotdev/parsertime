import { NoAuthCard } from "@/components/auth/no-auth";
import { DashboardLayout } from "@/components/dashboard-layout";
import { DangerZone } from "@/components/scrim/danger-zone";
import { EditScrimForm } from "@/components/scrim/edit-scrim-form";
import { Link } from "@/components/ui/link";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrimService } from "@/data/scrim";
import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { ScoutingService } from "@/data/scouting";
import { UserService } from "@/data/user";
import { auth, isAuthedToViewScrim } from "@/lib/auth";
import { scoutingTool } from "@/lib/flags";
import { getFlag } from "@/lib/flags-helpers";
import { resolveMapDataId } from "@/lib/map-data-resolver";
import {
  getMetadataTranslations,
  getStaticTranslations,
} from "@/lib/metadata-i18n";
import prisma from "@/lib/prisma";
import type { Metadata, Route } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

export async function generateMetadata(
  props: PageProps<"/[team]/scrim/[scrimId]/edit">
): Promise<Metadata> {
  const params = await props.params;
  const t = getMetadataTranslations("scrimPage.editMetadata");
  const scrim = await AppRuntime.runPromise(
    ScrimService.pipe(
      Effect.flatMap((svc) => svc.getScrim(parseInt(params.scrimId)))
    )
  );

  if (!scrim) return { title: "Edit Scrim | Sightline" };

  return {
    title: t("title", { scrimName: scrim.name }),
    description: t("description", { scrimName: scrim.name }),
  };
}

// Static shell: the page frame prerenders and the request-derived content
// (params, auth, scrim data) streams into ONE boundary whose fallback mirrors
// the form's pending layout — the back link needs route params, so it streams
// with the content.
export default function EditScrimPage(
  props: PageProps<"/[team]/scrim/[scrimId]/edit">
) {
  return (
    <DashboardLayout>
      <main className="container py-2">
        <Suspense fallback={<EditScrimSkeleton />}>
          <EditScrimContent params={props.params} />
        </Suspense>
      </main>
    </DashboardLayout>
  );
}

async function EditScrimContent({
  params,
}: {
  params: PageProps<"/[team]/scrim/[scrimId]/edit">["params"];
}) {
  const { team, scrimId } = await params;
  // The route's access gate — the [scrimId] layout no longer gates the
  // subtree (a layout gate adds a chrome-less loading phase above every
  // child route).
  if (!(await isAuthedToViewScrim(parseInt(scrimId)))) return <NoAuthCard />;
  const scrim = await AppRuntime.runPromise(
    ScrimService.pipe(Effect.flatMap((svc) => svc.getScrim(parseInt(scrimId))))
  );
  const session = await auth();
  const t = await getTranslations("scrimPage.editScrim");

  if (!scrim) {
    return <div>{t("scrimNotFound")}</div>;
  }

  const [teamsWithPerms, scoutingTeamList, scoutingEnabled] = await Promise.all(
    [
      AppRuntime.runPromise(
        UserService.pipe(
          Effect.flatMap((svc) => svc.getTeamsWithPerms(session?.user?.email))
        )
      ),
      AppRuntime.runPromise(
        ScoutingService.pipe(Effect.flatMap((svc) => svc.getScoutingTeams()))
      ),
      getFlag(scoutingTool),
    ]
  );

  const maps = await prisma.map.findMany({
    where: {
      scrimId: scrim.id,
    },
    orderBy: [{ order: "asc" }, { id: "asc" }],
  });

  const [heroBansByMap, teamNamesByMap] = await Promise.all([
    Promise.all(
      maps.map(async (map) => {
        const mapDataId = await resolveMapDataId(map.id);
        return prisma.heroBan.findMany({
          where: { MapDataId: mapDataId },
          orderBy: { banPosition: "asc" },
        });
      })
    ),
    Promise.all(
      maps.map(async (map) => {
        const mapDataId = await resolveMapDataId(map.id);
        return prisma.matchStart.findFirst({
          where: { MapDataId: mapDataId },
          select: { team_1_name: true, team_2_name: true },
        });
      })
    ),
  ]);

  const mapsWithHeroBans = maps.map((map, index) => ({
    ...map,
    heroBans: heroBansByMap[index],
    team1Name: teamNamesByMap[index]?.team_1_name ?? "Team 1",
    team2Name: teamNamesByMap[index]?.team_2_name ?? "Team 2",
  }));

  return (
    <>
      <h4 className="pb-2 text-gray-600 dark:text-gray-400">
        <Link href={`/${team}/scrim/${scrimId}` as Route}>
          &larr; {t("back")}
        </Link>
      </h4>
      <div className="mx-auto max-w-lg px-4">
        <h3 className="scroll-m-20 pb-2 text-2xl font-semibold tracking-tight">
          {t("title")}
        </h3>

        <EditScrimForm
          scrim={scrim}
          teams={teamsWithPerms}
          maps={mapsWithHeroBans}
          scoutingEnabled={scoutingEnabled}
          scoutingTeams={scoutingTeamList.map((st) => ({
            abbreviation: st.abbreviation,
            fullName: st.fullName,
          }))}
        />
        <div className="p-4" />
        <DangerZone scrim={scrim} />
      </div>
    </>
  );
}

// Mirrors the loaded content's layout (back-link line, real heading, form
// field groups, guest-mode switch row, maps list, submit button, danger-zone
// card) so the streamed content replaces this in place with no jump.
function EditScrimSkeleton() {
  const t = getStaticTranslations("scrimPage.editScrim");

  return (
    <>
      <h4 className="pb-2">
        <Skeleton className="h-5 w-28" />
      </h4>
      <div className="mx-auto max-w-lg px-4">
        <h3 className="scroll-m-20 pb-2 text-2xl font-semibold tracking-tight">
          {t("title")}
        </h3>
        <div className="space-y-8">
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-3 w-64" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-3 w-56" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-3 w-48" />
          </div>
          <div className="flex flex-row items-start space-x-3">
            <Skeleton className="h-5 w-10 shrink-0 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-72 max-w-full" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-12" />
            {["a", "b", "c"].map((k) => (
              <Skeleton key={k} className="h-10 w-full rounded-md" />
            ))}
          </div>
          <Skeleton className="h-10 w-24 rounded-md" />
        </div>
        <div className="p-4" />
        <div className="space-y-3 rounded-lg border border-red-500 p-6 dark:border-red-700">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-64" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
      </div>
    </>
  );
}
