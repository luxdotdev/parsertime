import { MainNav } from "@/components/dashboard/main-nav";
import { Search } from "@/components/dashboard/search";
import { GuestNav } from "@/components/guest-nav";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { MobileNav } from "@/components/mobile-nav";
import { Notifications } from "@/components/notifications";
import { ModeToggle } from "@/components/theme-switcher";
import { UserNav } from "@/components/user-nav";
import type { User } from "@/generated/prisma/browser";
import {
  aiChat,
  coachingCanvas,
  dataLabeling,
  faceitScouting,
  queryBuilder,
  scoutingTool,
  tournament,
} from "@/lib/flags";
import type { Session } from "next-auth";

/**
 * Shared header bar for authenticated app pages (dashboard, map, player).
 *
 * Owns the single source of truth for the header shell: the wrapper, the
 * desktop/mobile bars, and the right-side utility cluster. The only thing that
 * varies between pages is which switcher sits on the left, so it is passed in
 * as a slot. All nav feature flags are resolved here (deduped per request) so
 * the navigation is identical on every page.
 */
export async function AppHeader({
  switcher,
  session,
  user,
  guestMode = false,
}: {
  /** Left-side switcher slot, e.g. <TeamSwitcher /> or <PlayerSwitcher />. */
  switcher?: React.ReactNode;
  session: Session | null;
  user: User | null;
  guestMode?: boolean;
}) {
  const [
    scoutingEnabled,
    faceitScoutingEnabled,
    aiChatEnabled,
    dataToolsEnabled,
    tournamentEnabled,
    coachingCanvasEnabled,
    queryBuilderEnabled,
  ] = await Promise.all([
    scoutingTool(),
    faceitScouting(),
    aiChat(),
    dataLabeling(),
    tournament(),
    coachingCanvas(),
    queryBuilder(),
  ]);

  // Right-side utilities shared by both bars. The desktop bar additionally
  // prepends the Search button.
  const trailingUtilities = (
    <>
      <ModeToggle />
      <LocaleSwitcher />
      {session ? (
        <>
          <Notifications />
          <UserNav />
        </>
      ) : (
        <GuestNav guestMode={guestMode} />
      )}
    </>
  );

  return (
    <header
      className="relative z-50 shadow-xs"
      style={{ viewTransitionName: "site-header" }}
    >
      <div className="hidden min-h-16 items-center px-4 py-2 md:flex">
        {switcher}
        <MainNav
          className="mx-6 hidden lg:block"
          scoutingEnabled={scoutingEnabled}
          faceitScoutingEnabled={faceitScoutingEnabled}
          aiChatEnabled={aiChatEnabled}
          dataToolsEnabled={dataToolsEnabled}
          tournamentEnabled={tournamentEnabled}
          coachingCanvasEnabled={coachingCanvasEnabled}
          queryBuilderEnabled={queryBuilderEnabled}
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
          {trailingUtilities}
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
          {trailingUtilities}
        </div>
      </div>
    </header>
  );
}
