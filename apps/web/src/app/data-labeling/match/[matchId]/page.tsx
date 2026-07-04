import { MatchLabelingView } from "@/components/data-labeling/match-labeling-view";
import { Skeleton } from "@/components/ui/skeleton";
import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { DataLabelingService } from "@/data/admin";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { dataLabeling } from "@/lib/flags";
import { getFlag } from "@/lib/flags-helpers";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

type Params = { matchId: string };

export default function MatchLabelingPage({
  params,
}: {
  params: Promise<Params>;
}) {
  return (
    <div className="flex flex-1 flex-col px-4 pt-8 pb-8 sm:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <Suspense fallback={<MatchLabelingSkeleton />}>
          <MatchLabelingContent params={params} />
        </Suspense>
      </div>
    </div>
  );
}

async function MatchLabelingContent({ params }: { params: Promise<Params> }) {
  const enabled = await getFlag(dataLabeling);
  if (!enabled) notFound();
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (!isAdminUser(user)) notFound();

  const { matchId } = await params;
  const id = Number(matchId);
  if (Number.isNaN(id)) notFound();

  const match = await AppRuntime.runPromise(
    DataLabelingService.pipe(
      Effect.flatMap((svc) => svc.getMatchForLabeling(id))
    )
  );
  if (!match) notFound();

  return <MatchLabelingView match={match} />;
}

// Mirrors MatchLabelingView's pending layout: header row (back button, title,
// score badge) above the [1fr_400px] grid with the VOD panel left and the
// map-labeling tabs/panel right.
function MatchLabelingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-8 w-28 rounded-md" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-6 w-14 rounded-full" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        <div className="space-y-4">
          <Skeleton className="aspect-video w-full rounded-lg" />
          <div className="space-y-2 rounded-lg border p-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        </div>

        <div className="space-y-4">
          <Skeleton className="h-9 w-full rounded-md" />

          <div className="space-y-2 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-3 w-28" />
          </div>

          <div className="space-y-3">
            <Skeleton className="h-4 w-28" />
            <div className="flex items-center gap-2">
              {["a", "b", "c", "d", "e"].map((k) => (
                <Skeleton key={k} className="h-12 w-12 rounded-md" />
              ))}
            </div>
            {["a", "b", "c"].map((k) => (
              <div key={k} className="space-y-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-11 w-full rounded-md" />
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <Skeleton className="h-3 w-28" />
            <div className="space-y-1">
              {["a", "b", "c", "d", "e"].map((k) => (
                <Skeleton key={k} className="h-10 w-full rounded-md" />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Skeleton className="h-4 w-28" />
            <div className="flex items-center gap-2">
              {["f", "g", "h", "i", "j"].map((k) => (
                <Skeleton key={k} className="h-12 w-12 rounded-md" />
              ))}
            </div>
            {["f", "g", "h"].map((k) => (
              <div key={k} className="space-y-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-11 w-full rounded-md" />
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <Skeleton className="h-3 w-28" />
            <div className="space-y-1">
              {["f", "g", "h", "i", "j"].map((k) => (
                <Skeleton key={k} className="h-10 w-full rounded-md" />
              ))}
            </div>
          </div>

          <Skeleton className="h-9 w-full rounded-md" />
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
      </div>
    </div>
  );
}
