import { SelectedPlayerProvider } from "@/components/scrim/player-switcher";

export default function DashboardLayout({
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
