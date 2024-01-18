import { SelectedPlayerProvider } from "@/components/map/player-switcher";

export default function ScrimDashboardLayout({
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
