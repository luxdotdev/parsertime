import { DashboardLayout } from "@/components/dashboard-layout";
import { CreateTournamentButton } from "@/components/tournament/create-tournament-button";
import { tournament } from "@/lib/flags";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("tournamentsPage.create.metadata");
  return { title: t("title"), description: t("description") };
}

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
