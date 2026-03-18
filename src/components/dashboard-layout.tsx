import { MainNav } from "@/components/dashboard/main-nav";
import { Search } from "@/components/dashboard/search";
import { TeamSwitcher } from "@/components/dashboard/team-switcher";
import { Footer } from "@/components/footer";
import { GuestNav } from "@/components/guest-nav";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { MobileNav } from "@/components/mobile-nav";
import { Notifications } from "@/components/notifications";
import { TeamSwitcherProvider } from "@/components/team-switcher-provider";
import { ModeToggle } from "@/components/theme-switcher";
import { UserNav } from "@/components/user-nav";
import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import { scoutingTool } from "@/lib/flags";

export async function DashboardLayout({
  children,
  guestMode,
}: {
  children: React.ReactNode;
  guestMode?: boolean;
}) {
  const [session, scoutingEnabled] = await Promise.all([
    auth(),
    scoutingTool(),
  ]);
  const user = await getUser(session?.user?.email);

  return (
    <TeamSwitcherProvider>
      <a
        href="#main-content"
        className="focus-visible:bg-background focus-visible:text-foreground sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-4 focus-visible:left-4 focus-visible:z-50 focus-visible:rounded-md focus-visible:px-4 focus-visible:py-2 focus-visible:text-sm focus-visible:font-semibold focus-visible:shadow-lg"
      >
        Skip to content
      </a>
      <div className="min-h-[90vh] flex-col md:flex">
        <div className="shadow-sm">
          <div className="hidden min-h-16 items-center px-4 py-2 md:flex">
            <TeamSwitcher session={session} />
            <MainNav
              scoutingEnabled={scoutingEnabled}
              className="mx-6 hidden lg:block"
            />
            <MobileNav className="block pl-2 lg:hidden" session={session} />
            <div className="ml-auto flex items-center space-x-4">
              <Search user={user} />
              <ModeToggle />
              <LocaleSwitcher />
              {session ? (
                <>
                  <Notifications />
                  <UserNav />
                </>
              ) : (
                <GuestNav guestMode={guestMode ?? false} />
              )}
            </div>
          </div>
          <div className="flex h-16 items-center px-4 md:hidden">
            <MobileNav session={session} />
            <div className="ml-auto flex items-center space-x-4">
              <ModeToggle />
              <LocaleSwitcher />
              {session ? (
                <>
                  <Notifications />
                  <UserNav />
                </>
              ) : (
                <GuestNav guestMode={guestMode ?? false} />
              )}
            </div>
          </div>
        </div>
        <main id="main-content">{children}</main>
      </div>
      <Footer />
    </TeamSwitcherProvider>
  );
}
