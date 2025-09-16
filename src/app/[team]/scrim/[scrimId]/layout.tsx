import NoAuthCard from "@/components/auth/no-auth";
import { SelectedPlayerProvider } from "@/components/map/player-switcher";
import { isAuthedToViewScrim } from "@/lib/auth";

export default async function ScrimDashboardLayout(
  props: LayoutProps<"/[team]/scrim/[scrimId]">
) {
  const params = await props.params;

  const { children } = props;

  const id = parseInt(params.scrimId);
  const isAuthed = await isAuthedToViewScrim(id);

  if (!isAuthed) {
    return <NoAuthCard />;
  }

  return <SelectedPlayerProvider>{children}</SelectedPlayerProvider>;
}
