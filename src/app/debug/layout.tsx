import DashboardLayout from "@/components/dashboard-layout";

export default async function DebugLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
