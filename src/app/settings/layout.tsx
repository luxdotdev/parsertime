import { Metadata, Route } from "next";

import DashboardLayout from "@/components/dashboard-layout";
import { SidebarNav } from "@/components/settings/sidebar-nav";
import { Separator } from "@/components/ui/separator";
import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import { $Enums } from "@prisma/client";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(
  props: LayoutProps<"/settings">
): Promise<Metadata> {
  const params = (await props.params) as { locale: string };
  const t = await getTranslations("settingsPage.metadata");

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
      locale: params.locale,
    },
  };
}

export default async function SettingsLayout({
  children,
}: LayoutProps<"/settings">) {
  const t = await getTranslations("settingsPage");

  const sidebarNavItems: { title: string; href: Route }[] = [
    {
      title: t("sideNav.profile"),
      href: "/settings",
    },
    {
      title: t("sideNav.linkedAccounts"),
      href: "/settings/accounts",
    },
  ];

  const adminNavItems: { title: string; href: Route }[] = [
    ...sidebarNavItems,
    {
      title: t("sideNav.admin"),
      href: "/settings/admin",
    },
  ];

  const session = await auth();

  const user = await getUser(session?.user?.email);

  const isAdmin = user?.role === $Enums.UserRole.ADMIN;

  return (
    <DashboardLayout>
      <div className="min-h-[90vh] space-y-6 p-10 pb-16 md:block">
        <div className="space-y-0.5">
          <h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <Separator className="my-6" />
        <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
          <aside className="-mx-4 lg:w-1/5">
            <SidebarNav items={isAdmin ? adminNavItems : sidebarNavItems} />
          </aside>
          <div className="flex-1 lg:max-w-2xl">{children}</div>
        </div>
      </div>
    </DashboardLayout>
  );
}
