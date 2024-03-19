import NoAuthCard from "@/components/auth/no-auth";
import MobileBanner from "@/components/map/mobile-banner";
import { SelectedPlayerProvider } from "@/components/map/player-switcher";
import { isAuthedToViewMap } from "@/lib/auth";

export default async function MapDashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { team: string; scrimId: string; mapId: string };
}) {
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
