import NoAuthCard from "@/components/auth/no-auth";
import MobileBanner from "@/components/map/mobile-banner";
import { SelectedPlayerProvider } from "@/components/map/player-switcher";
import { isAuthedToViewMap } from "@/lib/auth";

export default async function MapDashboardLayout(
  props: {
    children: React.ReactNode;
    params: Promise<{ team: string; scrimId: string; mapId: string }>;
  }
) {
  const params = await props.params;

  const {
    children
  } = props;

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
    </SelectedPlayerProvider>
  );
}
