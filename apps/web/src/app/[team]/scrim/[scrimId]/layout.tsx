import { NoAuthCard } from "@/components/auth/no-auth";
import { SelectedPlayerProvider } from "@/components/map/player-switcher";
import { Skeleton } from "@/components/ui/skeleton";
import { isAuthedToViewScrim } from "@/lib/auth";
import { Suspense, type ReactNode } from "react";

export default function ScrimDashboardLayout(
  props: LayoutProps<"/[team]/scrim/[scrimId]">
) {
  // The auth check gates the whole subtree (scrim page and nested map routes),
  // so its fallback must contain the suspension here — otherwise it bubbles to
  // the root boot skeleton. A neutral content skeleton keeps the area from
  // dropping to a blank while the check resolves on first entry; each child
  // route's own loading.tsx takes over once auth passes.
  return (
    <Suspense fallback={<ScrimGateSkeleton />}>
      <ScrimAuthGate params={props.params}>{props.children}</ScrimAuthGate>
    </Suspense>
  );
}

function ScrimGateSkeleton() {
  return (
    <div className="min-h-[60vh] flex-1 space-y-4 px-6 pt-6 pb-12 md:px-8">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
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
