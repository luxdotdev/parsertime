import { TeamSearch } from "@/components/admin/team-search";
import { DashboardLayout } from "@/components/dashboard-layout";
import { EmptyTeamView } from "@/components/team/empty-team-view";
import { UserTeamsList } from "@/components/team/user-teams-list";
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
import { TeamPageSkeleton } from "./loading-skeleton";

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

export default function TeamPage() {
  return (
    <Suspense fallback={<TeamPageSkeleton />}>
      <TeamPageContent />
    </Suspense>
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

  const content = (
    <div className="flex-col md:flex">
      <div className="flex-1 space-y-4 p-8 pt-6">
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
      </div>
    </div>
  );

  return <DashboardLayout>{content}</DashboardLayout>;
}
