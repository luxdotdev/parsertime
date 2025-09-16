import NoAuthCard from "@/components/auth/no-auth";
import Footer from "@/components/footer";
import MobileBanner from "@/components/map/mobile-banner";
import { SelectedPlayerProvider } from "@/components/map/player-switcher";
import { isAuthedToViewMap } from "@/lib/auth";

export default async function MapDashboardLayout(
  props: LayoutProps<"/[team]/scrim/[scrimId]/map/[mapId]">
) {
  const params = await props.params;

  const { children } = props;

  const scrimId = parseInt(params.scrimId);
  const mapId = parseInt(params.mapId);

  const isAuthed = await isAuthedToViewMap(scrimId, mapId);

  if (!isAuthed) {
    return <NoAuthCard />;
  }

  return (
    <SelectedPlayerProvider>
      <MobileBanner />
      {children}
      <Footer />
    </SelectedPlayerProvider>
  );
}
