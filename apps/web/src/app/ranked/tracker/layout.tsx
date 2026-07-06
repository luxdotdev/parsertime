import { DashboardLayout } from "@/components/dashboard-layout";

export default function Layout({ children }: LayoutProps<"/ranked/tracker">) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
