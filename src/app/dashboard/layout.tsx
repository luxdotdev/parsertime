import { SelectedPlayerProvider } from "@/components/dashboard/player-switcher";

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
