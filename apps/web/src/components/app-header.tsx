import { Search } from "@/components/dashboard/search";
import { GuestNav } from "@/components/guest-nav";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Notifications } from "@/components/notifications";
import { ModeToggle } from "@/components/theme-switcher";
import { UserNav } from "@/components/user-nav";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import type { User } from "@/generated/prisma/browser";
import type { Session } from "@/lib/auth";

/**
 * The slim top bar for authenticated app pages. Primary navigation lives in
 * the sidebar (`AppSidebar`); this bar carries context and utilities: the
 * sidebar trigger, the left-side switcher slot (team or player switcher),
 * search, and the user cluster.
 */
export function AppHeader({
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
  return (
    <header
      className="bg-background relative z-40 border-b"
      style={{ viewTransitionName: "site-header" }}
    >
      <div className="flex h-14 items-center gap-2 px-4">
        <SidebarTrigger />
        {switcher && (
          <>
            <Separator
              orientation="vertical"
              className="mr-1 data-[orientation=vertical]:h-4 data-[orientation=vertical]:self-center"
            />
            <div className="min-w-0">{switcher}</div>
          </>
        )}
        <div className="ml-auto flex items-center gap-2">
          <div className="hidden sm:block">
            <Search user={user} />
          </div>
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
        </div>
      </div>
    </header>
  );
}
