import DashboardLayout from "@/components/dashboard-layout";

export default function Layout({ children }: LayoutProps<"/dashboard">) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
