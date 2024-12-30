import DashboardLayout from "@/components/dashboard-layout";

export default function DebugLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
