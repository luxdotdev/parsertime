import { AppHeader } from "@/components/app-header";
import { AppShell } from "@/components/app-shell";
import { NoAuthCard } from "@/components/auth/no-auth";
import { Footer } from "@/components/footer";
import { HeaderSkeleton } from "@/components/header-skeleton";
import { MapPageSkeleton } from "@/components/map/map-page-skeleton";
import { MobileBanner } from "@/components/map/mobile-banner";
import {
  PlayerSwitcher,
  SelectedPlayerProvider,
} from "@/components/map/player-switcher";
import {
  getCachedMostPlayedHeroes,
  getCachedScrimVisibility,
} from "@/data/cached/map-cache";
import { getMapViewerContext } from "@/data/cached/map-viewer";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { auth, isAuthedToViewMap } from "@/lib/auth";
import { Effect } from "effect";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";

export default function MapDashboardLayout(
  props: LayoutProps<"/scrims/[scrimId]/map/[mapId]">
) {
  // The chrome (provider, sidebar frame, banner, footer) is static so
  // navigations to a map paint instantly; the auth-derived top bar and the
  // authorization check + page each stream in behind their own boundary. The
  // header lives here — not in the map/player pages — so it mounts once and
  // survives map ⇄ player navigations.
  return (
    <SelectedPlayerProvider>
      <AppShell
        header={
          <Suspense fallback={<HeaderSkeleton />}>
            <MapAppHeader params={props.params} />
          </Suspense>
        }
      >
        <MobileBanner />
        <Suspense fallback={<MapPageSkeleton />}>
          <div className="flex-1">
            <MapAuthGate params={props.params}>{props.children}</MapAuthGate>
          </div>
          <Footer />
        </Suspense>
      </AppShell>
    </SelectedPlayerProvider>
  );
}

async function MapAppHeader({
  params,
}: {
  params: LayoutProps<"/scrims/[scrimId]/map/[mapId]">["params"];
}) {
  // Always streams behind its Suspense boundary; mark request-time up front
  // (same pattern as AuthedAppHeader) so PPR never tries to prerender the
  // auth/flag reads below.
  await connection();
  const { scrimId: rawScrimId, mapId: rawMapId } = await params;
  const scrimId = parseInt(rawScrimId);
  const mapId = parseInt(rawMapId);

  // Same private-cache scope the page uses, so the session/user reads are
  // shared with the page render instead of duplicated.
  const viewer = await getMapViewerContext(scrimId, mapId);

  if (!viewer.canView) {
    // Unauthorized viewers still get the top bar with their own user cluster;
    // the content boundary renders <NoAuthCard />. No switcher — the player
    // list is map data they can't view.
    const session = await auth();
    const user = await AppRuntime.runPromise(
      UserService.pipe(
        Effect.flatMap((svc) => svc.getUser(session?.user?.email))
      )
    );
    return <AppHeader session={session} user={user} />;
  }

  const [mostPlayedHeroes, visibility] = await Promise.all([
    getCachedMostPlayedHeroes(mapId),
    getCachedScrimVisibility(scrimId),
  ]);

  return (
    <AppHeader
      switcher={<PlayerSwitcher mostPlayedHeroes={mostPlayedHeroes} />}
      session={viewer.session}
      user={viewer.user}
      guestMode={visibility?.guestMode ?? false}
    />
  );
}

async function MapAuthGate({
  params,
  children,
}: {
  params: LayoutProps<"/scrims/[scrimId]/map/[mapId]">["params"];
  children: ReactNode;
}) {
  const { scrimId, mapId } = await params;
  const isAuthed = await isAuthedToViewMap(parseInt(scrimId), parseInt(mapId));
  if (!isAuthed) return <NoAuthCard />;
  return children;
}
