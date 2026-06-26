import { DashboardLayout } from "@/components/dashboard-layout";

export default function Layout({ children }: LayoutProps<"/ranked">) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
