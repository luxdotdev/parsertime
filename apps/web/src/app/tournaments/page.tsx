import { DashboardLayout } from "@/components/dashboard-layout";
import { CreateTournamentButton } from "@/components/tournament/create-tournament-button";
import { TournamentCard } from "@/components/tournament/tournament-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { TournamentService } from "@/data/tournament";
import { auth } from "@/lib/auth";
import { tournament } from "@/lib/flags";
import { getFlag } from "@/lib/flags-helpers";
import { getMetadataTranslations } from "@/lib/metadata-i18n";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

export function generateMetadata(): Metadata {
  const t = getMetadataTranslations("tournamentsPage.metadata");
  return { title: t("title"), description: t("description") };
}

// Static shell: the layout chrome, heading, and create button prerender, and
// the flag/auth-gated tournament list streams into ONE boundary whose
// fallback mirrors the loaded card grid.
export default function TournamentsPage() {
  return (
    <DashboardLayout>
      <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Tournaments</h2>
          <CreateTournamentButton />
        </div>
        <Suspense fallback={<TournamentListSkeleton />}>
          <TournamentsContent />
        </Suspense>
      </div>
    </DashboardLayout>
  );
}

async function TournamentsContent() {
  const tournamentEnabled = await getFlag(tournament);
  if (!tournamentEnabled) notFound();

  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const tournaments = await AppRuntime.runPromise(
    TournamentService.pipe(
      Effect.flatMap((svc) => svc.getUserTournaments(session.user.id))
    )
  );

  if (tournaments.length === 0) {
    return (
      <div className="text-muted-foreground flex flex-col items-center justify-center py-16 text-center">
        <p className="text-lg font-medium">No tournaments yet</p>
        <p className="text-sm">Create your first tournament to get started.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {tournaments.map((t) => (
        <TournamentCard
          key={t.id}
          id={t.id}
          name={t.name}
          format={t.format}
          status={t.status}
          teamSlots={t.teamSlots}
          bestOf={t.bestOf}
          playoffBestOf={t.playoffBestOf}
          teamNames={t.teams.map((team) => team.name)}
          matchCount={t._count.matches}
          createdAt={t.createdAt}
        />
      ))}
    </div>
  );
}

// Mirrors the loaded TournamentCard grid (card header with name + status
// badge, description line, team/match meta) so the streamed list replaces
// this in place.
function TournamentListSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {["a", "b", "c", "d", "e", "f"].map((k) => (
        <div key={k} className="border-border rounded-xl border">
          <div className="flex flex-col space-y-1.5 p-6 pb-2">
            <div className="flex items-start justify-between gap-2">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-5 w-16 shrink-0" />
            </div>
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="p-6 pt-0">
            <div className="space-y-1">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
