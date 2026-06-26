import { NoAuthCard } from "@/components/auth/no-auth";
import { Footer } from "@/components/footer";
import { MobileBanner } from "@/components/map/mobile-banner";
import { SelectedPlayerProvider } from "@/components/map/player-switcher";
import { isAuthedToViewMap } from "@/lib/auth";
import { Suspense, type ReactNode } from "react";

export default function MapDashboardLayout(
  props: LayoutProps<"/[team]/scrim/[scrimId]/map/[mapId]">
) {
  // The chrome (provider, banner, footer) is static so navigations to a map
  // paint instantly; the authorization check and the page stream in behind it.
  return (
    <SelectedPlayerProvider>
      <MobileBanner />
      <Suspense fallback={null}>
        <MapAuthGate params={props.params}>{props.children}</MapAuthGate>
        <Footer />
      </Suspense>
    </SelectedPlayerProvider>
  );
}

async function MapAuthGate({
  params,
  children,
}: {
  params: LayoutProps<"/[team]/scrim/[scrimId]/map/[mapId]">["params"];
  children: ReactNode;
}) {
  const { scrimId, mapId } = await params;
  const isAuthed = await isAuthedToViewMap(parseInt(scrimId), parseInt(mapId));
  if (!isAuthed) return <NoAuthCard />;
  return children;
}
