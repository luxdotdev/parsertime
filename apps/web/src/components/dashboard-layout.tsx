import { AppHeader } from "@/components/app-header";
import { TeamSwitcher } from "@/components/dashboard/team-switcher";
import { Footer } from "@/components/footer";
import { TeamSwitcherProvider } from "@/components/team-switcher-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { auth } from "@/lib/auth";
import { Effect } from "effect";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";

export function DashboardLayout({
  children,
  guestMode,
}: {
  children: ReactNode;
  guestMode?: boolean;
}) {
  // The page chrome (skip link, layout structure, Footer) is static so any
  // route using this layout paints instantly; the auth-derived header and the
  // page content each stream in behind their own boundary.
  return (
    <TeamSwitcherProvider>
      <a
        href="#main-content"
        className="focus-visible:bg-background focus-visible:text-foreground sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-4 focus-visible:left-4 focus-visible:z-50 focus-visible:rounded-md focus-visible:px-4 focus-visible:py-2 focus-visible:text-sm focus-visible:font-semibold focus-visible:shadow-lg"
      >
        Skip to content
      </a>
      <div className="min-h-[90vh] flex-col md:flex">
        <Suspense fallback={<div className="border-border h-14 border-b" />}>
          <AuthedAppHeader guestMode={guestMode} />
        </Suspense>
        <main id="main-content">
          <Suspense fallback={<DashboardContentSkeleton />}>
            {children}
          </Suspense>
        </main>
      </div>
      <Footer />
    </TeamSwitcherProvider>
  );
}

// Shown while a page's own content streams in, so the content area under the
// (already-painted) header never drops to a blank.
function DashboardContentSkeleton() {
  return (
    <div className="flex-1 space-y-4 px-6 pt-6 pb-12 md:px-8">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
  );
}

async function AuthedAppHeader({ guestMode }: { guestMode?: boolean }) {
  // This header is per-user (auth-derived) and always streams behind its
  // Suspense boundary, so mark it request-time up front. Without this, PPR
  // attempts to prerender it and trips on `Date.now()` inside the Effect
  // runtime before the auth read defers it.
  await connection();
  const session = await auth();
  const user = await AppRuntime.runPromise(
    UserService.pipe(Effect.flatMap((svc) => svc.getUser(session?.user?.email)))
  );

  return (
    <AppHeader
      switcher={session && <TeamSwitcher session={session} />}
      session={session}
      user={user}
      guestMode={guestMode}
    />
  );
}
