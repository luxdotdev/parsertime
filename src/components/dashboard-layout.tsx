import { AppHeader } from "@/components/app-header";
import { TeamSwitcher } from "@/components/dashboard/team-switcher";
import { Footer } from "@/components/footer";
import { TeamSwitcherProvider } from "@/components/team-switcher-provider";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { auth } from "@/lib/auth";
import { Effect } from "effect";

export async function DashboardLayout({
  children,
  guestMode,
}: {
  children: React.ReactNode;
  guestMode?: boolean;
}) {
  const session = await auth();
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
        <AppHeader
          switcher={session && <TeamSwitcher session={session} />}
          session={session}
          user={user}
          guestMode={guestMode}
        />
        <main id="main-content">{children}</main>
      </div>
      <Footer />
    </TeamSwitcherProvider>
  );
}
