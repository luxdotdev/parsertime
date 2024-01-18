import { SelectedPlayerProvider } from "@/components/scrim/player-switcher";

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
