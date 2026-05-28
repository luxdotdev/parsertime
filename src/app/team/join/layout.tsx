import { DashboardLayout } from "@/components/dashboard-layout";

export default function PublicTeamJoinLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout guestMode>{children}</DashboardLayout>;
}
