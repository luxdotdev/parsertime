import { DashboardLayout } from "@/components/dashboard-layout";

export default function FaceitLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
