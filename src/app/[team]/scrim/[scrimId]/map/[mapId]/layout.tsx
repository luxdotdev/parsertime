import { SelectedPlayerProvider } from "@/components/scrim/player-switcher";

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
