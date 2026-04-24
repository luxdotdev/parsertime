import { DashboardLayout } from "@/components/dashboard-layout";

export default function TeamLayout({ children }: LayoutProps<"/team">) {
  // guestMode lets public routes (e.g. availability fill link) render for
  // unauthenticated visitors without triggering GuestNav's redirect-to-sign-in.
  // Authed pages under /team still gate themselves (isAuthedToViewTeam, etc.).
  return <DashboardLayout guestMode>{children}</DashboardLayout>;
}
