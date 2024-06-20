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
import { WorkshopCode } from "@/components/workshop-code";

export default async function DashboardLayout({
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
              <WorkshopCode />
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
