import DashboardLayout from "@/components/dashboard-layout";

export default function TeamLayout({ children }: LayoutProps<"/team">) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
