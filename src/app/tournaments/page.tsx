import { DashboardLayout } from "@/components/dashboard-layout";
import { CreateTournamentButton } from "@/components/tournament/create-tournament-button";
import { TournamentCard } from "@/components/tournament/tournament-card";
import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { TournamentService } from "@/data/tournament";
import { auth } from "@/lib/auth";
import { tournament } from "@/lib/flags";
import { notFound, redirect } from "next/navigation";

export default async function TournamentsPage() {
  const tournamentEnabled = await tournament();
  if (!tournamentEnabled) notFound();

  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const tournaments = await AppRuntime.runPromise(
    TournamentService.pipe(
      Effect.flatMap((svc) => svc.getUserTournaments(session.user.id!))
    )
  );

  return (
    <DashboardLayout>
      <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Tournaments</h2>
          <CreateTournamentButton />
        </div>

        {tournaments.length === 0 ? (
          <div className="text-muted-foreground flex flex-col items-center justify-center py-16 text-center">
            <p className="text-lg font-medium">No tournaments yet</p>
            <p className="text-sm">
              Create your first tournament to get started.
            </p>
          </div>
        ) : (
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
                teamNames={t.teams.map((team) => team.name)}
                matchCount={t._count.matches}
                createdAt={t.createdAt}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
