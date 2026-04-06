import { DashboardLayout } from "@/components/dashboard-layout";
import { CreateTournamentButton } from "@/components/tournament/create-tournament-button";
import { tournament } from "@/lib/flags";
import { notFound } from "next/navigation";

export default async function CreateTournamentPage() {
  const tournamentEnabled = await tournament();
  if (!tournamentEnabled) notFound();

  return (
    <DashboardLayout>
      <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
        <h2 className="text-3xl font-bold tracking-tight">Create Tournament</h2>
        <p className="text-muted-foreground">
          Use the button below to create a new tournament.
        </p>
        <CreateTournamentButton />
      </div>
    </DashboardLayout>
  );
}
