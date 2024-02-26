import { Metadata } from "next";

import { Separator } from "@/components/ui/separator";
import { SidebarNav } from "@/components/settings/sidebar-nav";
import { TeamSwitcher } from "@/components/dashboard/team-switcher";
import { MainNav } from "@/components/dashboard/main-nav";
import { Search } from "@/components/dashboard/search";
import { ModeToggle } from "@/components/theme-switcher";
import { UserNav } from "@/components/user-nav";
import Footer from "@/components/footer";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { $Enums } from "@prisma/client";

export const metadata: Metadata = {
  title: "Settings | Parsertime",
  description: "Manage your account settings and preferences.",
  openGraph: {
    title: "Settings | Parsertime",
    description: "Manage your account settings and preferences.",
    url: "https://parsertime.app",
    type: "website",
    siteName: "Parsertime",
    images: [
      {
        url: `https://parsertime.app/api/og?title=Settings`,
        width: 1200,
        height: 630,
      },
    ],
    locale: "en_US",
  },
};

const sidebarNavItems = [
  {
    title: "Profile",
    href: "/settings",
  },
];

const adminNavItems = [
  ...sidebarNavItems,
  {
    title: "Admin",
    href: "/settings/admin",
  },
];

interface SettingsLayoutProps {
  children: React.ReactNode;
}

export default async function SettingsLayout({
  children,
}: SettingsLayoutProps) {
  const session = await auth();

  const user = await prisma.user.findUnique({
    where: {
      email: session?.user?.email ?? "",
    },
  });

  const isAdmin = user?.role === $Enums.UserRole.ADMIN;

  return (
    <>
      <div className="border-b">
        <div className="flex h-16 items-center px-4">
          <TeamSwitcher session={session} />
          <MainNav className="mx-6" />
          <div className="ml-auto flex items-center space-x-4">
            <Search />
            <ModeToggle />
            <UserNav />
          </div>
        </div>
      </div>
      <div className="hidden space-y-6 p-10 pb-16 md:block min-h-[90vh]">
        <div className="space-y-0.5">
          <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground">
            Manage your account settings and preferences.
          </p>
        </div>
        <Separator className="my-6" />
        <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
          <aside className="-mx-4 lg:w-1/5">
            <SidebarNav items={isAdmin ? adminNavItems : sidebarNavItems} />
          </aside>
          <div className="flex-1 lg:max-w-2xl">{children}</div>
        </div>
      </div>
      <Footer />
    </>
  );
}
