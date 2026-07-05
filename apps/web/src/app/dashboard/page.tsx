import { DirectionalTransition } from "@/components/directional-transition";
import { ScrimCardSkeleton } from "@/components/dashboard/scrim-card-skeleton";
import { ScrimPagination } from "@/components/dashboard/scrim-pagination";
import { UpdateModalWrapper } from "@/components/dashboard/update-modal-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { defaultLocale } from "@/i18n/config";
import { auth } from "@/lib/auth";
import {
  getMetadataTranslations,
  getStaticTranslations,
} from "@/lib/metadata-i18n";
import { getPendingFeedbackCount } from "@/lib/team-ops/scrim-feedback";
import { $Enums } from "@/generated/prisma/browser";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

export function generateMetadata(): Metadata {
  const t = getMetadataTranslations("dashboard.metadata");

  return {
    title: t("title"),
    description: t("description"),
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      url: "/",
      type: "website",
      siteName: "Sightline",
      images: [
        {
          url: "/opengraph-image.png",
          width: 1200,
          height: 630,
        },
      ],
      locale: defaultLocale,
    },
  };
}

// Static shell: the page frame and title prerender (default-locale title via
// the cookie-free translator), and the auth-derived content streams into ONE
// boundary whose fallback mirrors ScrimPagination's own pending layout — so
// navigation shows a single, stable skeleton instead of a cascade of
// different loading states.
export default function DashboardPage() {
  const t = getStaticTranslations("dashboard");

  return (
    <DirectionalTransition>
      <div className="flex-1 px-6 pt-6 pb-12 md:px-8">
        <div className="mb-3 flex items-end justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        </div>
        <Suspense fallback={<ScrimListSkeleton />}>
          <DashboardContent />
        </Suspense>
      </div>
    </DirectionalTransition>
  );
}

async function DashboardContent() {
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
    <>
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
    </>
  );
}

// Mirrors ScrimPagination's pending layout (toolbar row, meta line spacer,
// 16-card grid) so the streamed content replaces this in place with no jump.
function ScrimListSkeleton() {
  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="inline-flex gap-2">
          <Skeleton className="h-9 w-[180px] rounded-md" />
          <Skeleton className="hidden h-9 rounded-md md:block md:w-[100px] lg:w-[260px]" />
        </span>
        <Skeleton className="h-9 w-[140px] rounded-md" />
      </div>
      <div className="mt-4 h-5" aria-hidden="true" />
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 16 }, (_, i) => (
          <ScrimCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
