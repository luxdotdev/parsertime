import { TeamSearch } from "@/components/admin/team-search";
import { DashboardLayout } from "@/components/dashboard-layout";
import { EmptyTeamView } from "@/components/team/empty-team-view";
import { UserTeamsList } from "@/components/team/user-teams-list";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { defaultLocale } from "@/i18n/config";
import { auth } from "@/lib/auth";
import { getMetadataTranslations } from "@/lib/metadata-i18n";
import prisma from "@/lib/prisma";
import { $Enums } from "@/generated/prisma/browser";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export function generateMetadata(): Metadata {
  const t = getMetadataTranslations("teamPage.metadata");
  return {
    title: t("title"),
    description: t("description"),
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      url: "https://parsertime.app",
      type: "website",
      siteName: "Parsertime",
      images: [
        {
          url: `https://parsertime.app/api/og?title=${t("ogImage")}`,
          width: 1200,
          height: 630,
        },
      ],
      locale: defaultLocale,
    },
  };
}

// Static shell: DashboardLayout's chrome and the page frame prerender, and the
// auth-derived teams content streams into ONE boundary whose fallback mirrors
// the loaded heading/tabs/grid layout — so navigation shows a single stable
// skeleton instead of a route loading.tsx plus in-page skeleton cascade. The
// heading text depends on the user's role, so it lives in the content child.
export default function TeamPage() {
  return (
    <DashboardLayout>
      <div className="flex-col md:flex">
        <div className="flex-1 space-y-4 p-8 pt-6">
          <Suspense fallback={<TeamListSkeleton />}>
            <TeamPageContent />
          </Suspense>
        </div>
      </div>
    </DashboardLayout>
  );
}

async function TeamPageContent() {
  const t = await getTranslations("teamPage");

  const session = await auth();
  if (!session?.user?.email) {
    redirect("/sign-in");
  }

  const userData = await AppRuntime.runPromise(
    UserService.pipe(Effect.flatMap((svc) => svc.getUser(session.user.email)))
  );

  const userTeams = await prisma.team.findMany({
    where: { users: { some: { id: userData?.id } } },
  });

  const hasPerms =
    userData?.role === $Enums.UserRole.ADMIN ||
    userData?.role === $Enums.UserRole.MANAGER;

  return (
    <>
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          {hasPerms ? t("manageTeams") : t("viewTeams")}
        </h2>
      </div>
      <Tabs defaultValue="teams" className="space-y-4">
        {hasPerms && (
          <TabsList>
            <TabsTrigger value="teams">{t("teams")}</TabsTrigger>
            <TabsTrigger value="admin">{t("admin")}</TabsTrigger>
          </TabsList>
        )}

        <TabsContent value="teams" className="space-y-4">
          {userTeams.length > 0 ? (
            <UserTeamsList teams={userTeams} />
          ) : (
            <EmptyTeamView />
          )}
        </TabsContent>
        <TabsContent value="admin" className="space-y-4">
          <TeamSearch />
        </TabsContent>
      </Tabs>
    </>
  );
}

// Mirrors the loaded content's pending layout (role-dependent heading row,
// tab list, UserTeamsList's search input and card grid) so the streamed
// content replaces this in place.
function TeamListSkeleton() {
  return (
    <>
      <div className="flex items-center justify-between space-y-2">
        <Skeleton className="h-9 w-48" />
      </div>
      <div className="space-y-4">
        <div className="inline-flex h-10 items-center gap-1 rounded-md p-1">
          <Skeleton className="h-8 w-16 rounded-sm" />
          <Skeleton className="h-8 w-14 rounded-sm" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-10 w-full max-w-sm rounded-md" />
          <div className="border-border grid grid-cols-1 gap-4 rounded-lg border p-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {["a", "b", "c", "d"].map((k) => (
              <div key={k} className="p-2">
                <Skeleton className="h-36 w-full rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
