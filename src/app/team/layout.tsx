import DashboardLayout from "@/components/dashboard-layout";

export default async function TeamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
