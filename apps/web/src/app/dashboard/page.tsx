import { DirectionalTransition } from "@/components/directional-transition";
import { ScrimPagination } from "@/components/dashboard/scrim-pagination";
import { UpdateModalWrapper } from "@/components/dashboard/update-modal-wrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { defaultLocale } from "@/i18n/config";
import { auth } from "@/lib/auth";
import { getMetadataTranslations } from "@/lib/metadata-i18n";
import { getPendingFeedbackCount } from "@/lib/team-ops/scrim-feedback";
import { $Enums } from "@/generated/prisma/browser";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export function generateMetadata(): Metadata {
  const t = getMetadataTranslations("dashboard.metadata");

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
          url: `https://parsertime.app/opengraph-image.png`,
          width: 1200,
          height: 630,
        },
      ],
      locale: defaultLocale,
    },
  };
}

export default async function DashboardPage() {
  const [session, t] = await Promise.all([
    auth(),
    getTranslations("dashboard"),
  ]);

  const email = session?.user?.email;

  const [userData, manageableTeams] = await Promise.all([
    AppRuntime.runPromise(
      UserService.pipe(Effect.flatMap((svc) => svc.getUser(email)))
    ),
    AppRuntime.runPromise(
      UserService.pipe(Effect.flatMap((svc) => svc.getTeamsWithPerms(email)))
    ),
  ]);

  const isAdmin = userData?.role === $Enums.UserRole.ADMIN;

  const manageableTeamIds = manageableTeams.map((team) => team.id);
  const pendingFeedbackCount = await getPendingFeedbackCount(manageableTeamIds);

  return (
    <DirectionalTransition>
      <div className="flex-1 px-6 pt-6 pb-12 md:px-8">
        <div className="mb-3 flex items-end justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        </div>
        {pendingFeedbackCount > 0 && (
          <p className="text-muted-foreground mb-4 text-sm">
            {t("pendingFeedback", { count: pendingFeedbackCount })}
          </p>
        )}
        <Tabs defaultValue="overview">
          {isAdmin && (
            <TabsList className="mb-5">
              <TabsTrigger value="overview">{t("overview")}</TabsTrigger>
              <TabsTrigger value="admin">{t("admin")}</TabsTrigger>
            </TabsList>
          )}
          <TabsContent value="overview" className="mt-0">
            <ScrimPagination seenOnboarding={userData?.seenOnboarding} />
          </TabsContent>
          <TabsContent value="admin" className="mt-0">
            <ScrimPagination isAdmin={true} seenOnboarding={true} />
          </TabsContent>
        </Tabs>
        <UpdateModalWrapper />
      </div>
    </DirectionalTransition>
  );
}
