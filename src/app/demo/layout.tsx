import { SelectedPlayerProvider } from "@/components/map/player-switcher";

export default function MapDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SelectedPlayerProvider>{children}</SelectedPlayerProvider>
    </>
  );
}
