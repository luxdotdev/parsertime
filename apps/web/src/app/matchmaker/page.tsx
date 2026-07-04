import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import {
  MatchmakerHub,
  type HubTeam,
} from "@/components/matchmaker/matchmaker-hub";
import { Skeleton } from "@/components/ui/skeleton";
import { getMetadataTranslations } from "@/lib/metadata-i18n";
import { getTierBucket } from "@/lib/tsr/tier-bucket";
import type { Metadata } from "next";
import { Suspense } from "react";

export function generateMetadata(): Metadata {
  const t = getMetadataTranslations("matchmaker.metadata");
  return {
    title: t("title"),
    description: t("description"),
  };
}

// Static shell: MatchmakerHub paints the whole page (including its own
// padding/header), so the shell is a single boundary whose fallback mirrors
// the hub's layout and is replaced in place by the streamed content.
export default function MatchmakerHubPage() {
  return (
    <Suspense fallback={<MatchmakerHubSkeleton />}>
      <MatchmakerHubContent />
    </Suspense>
  );
}

async function MatchmakerHubContent() {
  const session = await auth();
  if (!session?.user?.email) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      teams: {
        where: { readonly: false },
        select: {
          id: true,
          name: true,
          teamTsrSnapshot: {
            select: {
              rating: true,
              region: true,
              bracketTier: true,
              bracketBand: true,
            },
          },
        },
        orderBy: { name: "asc" },
      },
    },
  });

  const hubTeams: HubTeam[] = (user?.teams ?? []).map((t) => {
    const snap = t.teamTsrSnapshot;
    if (!snap) {
      return {
        id: t.id,
        name: t.name,
        hasSnapshot: false,
        bracketLabel: null,
        bracketBand: null,
        region: null,
        rating: null,
        bracketTier: null,
      };
    }
    const bucket = getTierBucket(snap.rating);
    return {
      id: t.id,
      name: t.name,
      hasSnapshot: true,
      bracketLabel: bucket.label,
      bracketBand: bucket.band,
      region: snap.region,
      rating: snap.rating,
      bracketTier: snap.bracketTier,
    };
  });

  return <MatchmakerHub teams={hubTeams} />;
}

// Mirrors MatchmakerHub's layout: header, mechanics grid with 5/3/2 bullet
// groups, and the team picker list (button + blacklist link per row).
function MatchmakerHubSkeleton() {
  return (
    <div className="px-6 pt-8 pb-16 sm:px-10">
      <header className="border-border border-b pb-6">
        <Skeleton className="h-2.5 w-24" />
        <Skeleton className="mt-3 h-9 w-56" />
        <Skeleton className="mt-3 h-4 w-80 max-w-full" />
      </header>

      <section className="grid gap-x-10 gap-y-6 py-10 sm:py-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div>
          <Skeleton className="h-2.5 w-20" />
          <Skeleton className="mt-3 h-8 w-48" />
          <Skeleton className="mt-3 h-4 w-64 max-w-full" />
        </div>

        <div className="space-y-6">
          {([5, 3, 2] as const).map((count) => (
            <div key={count}>
              <Skeleton className="h-2.5 w-20" />
              <div className="mt-2 space-y-1.5">
                {Array.from({ length: count }, (_, i) => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-border border-t pt-10 sm:pt-12">
        <div className="grid gap-x-10 gap-y-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div>
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="mt-3 h-8 w-48" />
            <Skeleton className="mt-3 h-4 w-64 max-w-full" />
          </div>

          <div className="border-border divide-border bg-card divide-y overflow-hidden rounded-xl border">
            {["a", "b", "c"].map((k) => (
              <div
                key={k}
                className="flex items-center justify-between gap-4 px-5 py-4"
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-2.5 w-24" />
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <Skeleton className="h-9 w-28 rounded-md" />
                  <Skeleton className="h-2.5 w-24" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
