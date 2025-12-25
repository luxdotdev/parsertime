import { ScrimPagination } from "@/components/dashboard/scrim-pagination";
import { UpdateModalWrapper } from "@/components/dashboard/update-modal-wrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAppSettings, getUser } from "@/data/user-dto";
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
  const session = await auth();

  const userData = await getUser(session?.user?.email);

  const isAdmin = userData?.role === $Enums.UserRole.ADMIN;

  const t = await getTranslations("dashboard");

  const appSettings = await getAppSettings(session?.user.email);
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">{t("title")}</h2>
      </div>
      <Tabs defaultValue="overview" className="space-y-4">
        {isAdmin && (
          <TabsList>
            <TabsTrigger value="overview">{t("overview")}</TabsTrigger>
            <TabsTrigger value="admin">{t("admin")}</TabsTrigger>
          </TabsList>
        )}
        <TabsContent value="overview" className="space-y-4">
          <main>
            <ScrimPagination seeOnboarding={appSettings?.seeOnboarding} />
          </main>
        </TabsContent>
        <TabsContent value="admin" className="space-y-4">
          <main>
            <ScrimPagination
              isAdmin={true}
              seeOnboarding={appSettings?.seeOnboarding}
            />
          </main>
        </TabsContent>
      </Tabs>
      <UpdateModalWrapper />
    </div>
  );
}
