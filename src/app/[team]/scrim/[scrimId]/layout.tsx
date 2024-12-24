import NoAuthCard from "@/components/auth/no-auth";
import DashboardLayout from "@/components/dashboard-layout";
import { SelectedPlayerProvider } from "@/components/map/player-switcher";
import { isAuthedToViewScrim } from "@/lib/auth";

export default async function ScrimDashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { team: string; scrimId: string };
}) {
  const id = parseInt(params.scrimId);
  const isAuthed = await isAuthedToViewScrim(id);

  if (!isAuthed) {
    return <NoAuthCard />;
  }

  return (
    <SelectedPlayerProvider>
      <DashboardLayout>{children}</DashboardLayout>
    </SelectedPlayerProvider>
  );
}
