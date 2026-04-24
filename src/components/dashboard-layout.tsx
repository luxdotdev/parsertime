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
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { auth } from "@/lib/auth";
import {
  aiChat,
  coachingCanvas,
  dataLabeling,
  scoutingTool,
  tournament,
} from "@/lib/flags";
import { Effect } from "effect";

export async function DashboardLayout({
  children,
  guestMode,
}: {
  children: React.ReactNode;
  guestMode?: boolean;
}) {
  const [
    session,
    scoutingEnabled,
    aiChatEnabled,
    dataToolsEnabled,
    tournamentEnabled,
    coachingCanvasEnabled,
  ] = await Promise.all([
    auth(),
    scoutingTool(),
    aiChat(),
    dataLabeling(),
    tournament(),
    coachingCanvas(),
  ]);
  const user = await AppRuntime.runPromise(
    UserService.pipe(Effect.flatMap((svc) => svc.getUser(session?.user?.email)))
  );

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
            {session && <TeamSwitcher session={session} />}
            <MainNav
              scoutingEnabled={scoutingEnabled}
              aiChatEnabled={aiChatEnabled}
              dataToolsEnabled={dataToolsEnabled}
              tournamentEnabled={tournamentEnabled}
              coachingCanvasEnabled={coachingCanvasEnabled}
              className="mx-6 hidden lg:block"
            />
            <MobileNav
              className="block pl-2 lg:hidden"
              session={session}
              aiChatEnabled={aiChatEnabled}
              dataToolsEnabled={dataToolsEnabled}
              coachingCanvasEnabled={coachingCanvasEnabled}
            />
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
            <MobileNav
              session={session}
              aiChatEnabled={aiChatEnabled}
              dataToolsEnabled={dataToolsEnabled}
              coachingCanvasEnabled={coachingCanvasEnabled}
            />
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
