import { DashboardLayout } from "@/components/dashboard-layout";

export default function DebugLayout({ children }: LayoutProps<"/debug">) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
