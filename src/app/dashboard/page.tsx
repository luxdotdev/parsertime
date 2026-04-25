import { DirectionalTransition } from "@/components/directional-transition";
import { ScrimPagination } from "@/components/dashboard/scrim-pagination";
import { UpdateModalWrapper } from "@/components/dashboard/update-modal-wrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { auth } from "@/lib/auth";
import type { PagePropsWithLocale } from "@/types/next";
import { $Enums } from "@prisma/client";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(
  props: PagePropsWithLocale<"/dashboard">
): Promise<Metadata> {
  const params = await props.params;

  const { locale } = params;

  const t = await getTranslations({
    locale,
    namespace: "dashboard.metadata",
  });

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
      locale,
    },
  };
}

export default async function DashboardPage() {
  const [session, t] = await Promise.all([
    auth(),
    getTranslations("dashboard"),
  ]);

  const userData = await AppRuntime.runPromise(
    UserService.pipe(Effect.flatMap((svc) => svc.getUser(session?.user?.email)))
  );

  const isAdmin = userData?.role === $Enums.UserRole.ADMIN;

  return (
    <DirectionalTransition>
      <div className="flex-1 px-6 pt-6 pb-12 md:px-8">
        <div className="mb-3 flex items-end justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        </div>
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
