import { NoAuthCard } from "@/components/auth/no-auth";
import { DashboardLayout } from "@/components/dashboard-layout";
import { isAuthedToViewTeam } from "@/lib/auth";
import type { ReactNode } from "react";

export default function TeamLayout(props: LayoutProps<"/team/[teamId]">) {
  return (
    <DashboardLayout>
      <TeamAuthGate params={props.params}>{props.children}</TeamAuthGate>
    </DashboardLayout>
  );
}

async function TeamAuthGate({
  params,
  children,
}: {
  params: LayoutProps<"/team/[teamId]">["params"];
  children: ReactNode;
}) {
  const { teamId } = await params;
  if (!(await isAuthedToViewTeam(parseInt(teamId)))) return <NoAuthCard />;
  return children;
}
