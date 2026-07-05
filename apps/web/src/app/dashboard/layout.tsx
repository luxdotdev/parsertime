import { DashboardLayout } from "@/components/dashboard-layout";
import { DashboardTour } from "@/components/dashboard-tour";

export default function Layout({ children }: LayoutProps<"/dashboard">) {
  return (
    <DashboardLayout>
      <DashboardTour>{children}</DashboardTour>
    </DashboardLayout>
  );
}
