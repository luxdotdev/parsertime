import { NoAuthCard } from "@/components/auth/no-auth";
import { SelectedPlayerProvider } from "@/components/map/player-switcher";
import { isAuthedToViewScrim } from "@/lib/auth";
import { Suspense, type ReactNode } from "react";

export default function ScrimDashboardLayout(
  props: LayoutProps<"/[team]/scrim/[scrimId]">
) {
  return (
    <Suspense fallback={null}>
      <ScrimAuthGate params={props.params}>{props.children}</ScrimAuthGate>
    </Suspense>
  );
}

async function ScrimAuthGate({
  params,
  children,
}: {
  params: LayoutProps<"/[team]/scrim/[scrimId]">["params"];
  children: ReactNode;
}) {
  const { scrimId } = await params;
  const isAuthed = await isAuthedToViewScrim(parseInt(scrimId));
  if (!isAuthed) return <NoAuthCard />;
  return <SelectedPlayerProvider>{children}</SelectedPlayerProvider>;
}
