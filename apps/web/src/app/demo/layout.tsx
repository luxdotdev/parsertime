import DemoBanner from "@/components/demo/banner";
import { SelectedPlayerProvider } from "@/components/map/player-switcher";

export default function MapDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <DemoBanner />
      <SelectedPlayerProvider>{children}</SelectedPlayerProvider>
    </>
  );
}
