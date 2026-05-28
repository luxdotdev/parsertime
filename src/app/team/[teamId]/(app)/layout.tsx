import { NoAuthCard } from "@/components/auth/no-auth";
import { DashboardLayout } from "@/components/dashboard-layout";
import { isAuthedToViewTeam } from "@/lib/auth";

export default async function TeamLayout(props: LayoutProps<"/team/[teamId]">) {
  const params = await props.params;

  const { children } = props;

  const id = parseInt(params.teamId);
  const isAuthed = await isAuthedToViewTeam(id);

  if (!isAuthed) {
    return NoAuthCard();
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
