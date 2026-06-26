import { DashboardLayout } from "@/components/dashboard-layout";

export default function PublicAvailabilityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout guestMode>{children}</DashboardLayout>;
}
