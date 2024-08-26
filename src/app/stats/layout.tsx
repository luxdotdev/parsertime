import { MainNav } from "@/components/dashboard/main-nav";
import { Search } from "@/components/dashboard/search";
import { TeamSwitcher } from "@/components/dashboard/team-switcher";
import Footer from "@/components/footer";
import { MobileNav } from "@/components/mobile-nav";
import { TeamSwitcherProvider } from "@/components/team-switcher-provider";
import { ModeToggle } from "@/components/theme-switcher";
import { UserNav } from "@/components/user-nav";
import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("statsPage.metadataSettingsLayout");

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
          url: `https://parsertime.app/api/og?title=Statistics`,
          width: 1200,
          height: 630,
        },
      ],
      // locale: "en_US",
    },
  };
}

export default async function StatsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const user = await getUser(session?.user?.email);

  return (
    <TeamSwitcherProvider>
      <div className="min-h-[90vh] flex-col md:flex">
        <div className="border-b">
          <div className="hidden h-16 items-center px-4 md:flex">
            <TeamSwitcher session={session} />
            <MainNav className="mx-6" />
            <div className="ml-auto flex items-center space-x-4">
              <Search user={user} />
              <ModeToggle />
              <UserNav />
            </div>
          </div>
          <div className="flex h-16 items-center px-4 md:hidden">
            <MobileNav session={session} />
            <div className="ml-auto flex items-center space-x-4">
              <ModeToggle />
              <UserNav />
            </div>
          </div>
        </div>
        {children}
      </div>
      <Footer />
    </TeamSwitcherProvider>
  );
}
