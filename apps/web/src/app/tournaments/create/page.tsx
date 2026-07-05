import { DashboardLayout } from "@/components/dashboard-layout";
import { CreateTournamentButton } from "@/components/tournament/create-tournament-button";
import { Skeleton } from "@/components/ui/skeleton";
import { tournament } from "@/lib/flags";
import { getFlag } from "@/lib/flags-helpers";
import { getMetadataTranslations } from "@/lib/metadata-i18n";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

export function generateMetadata(): Metadata {
  const t = getMetadataTranslations("tournamentsPage.create.metadata");
  return { title: t("title"), description: t("description") };
}

// Static shell: the dashboard chrome prerenders and the flag-gated content
// streams into ONE boundary whose fallback mirrors the loaded layout. The
// heading stays inside the content because the flag can notFound() the page.
export default function CreateTournamentPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<CreateTournamentSkeleton />}>
        <CreateTournamentPageContent />
      </Suspense>
    </DashboardLayout>
  );
}

async function CreateTournamentPageContent() {
  const tournamentEnabled = await getFlag(tournament);
  if (!tournamentEnabled) notFound();

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <h2 className="text-3xl font-bold tracking-tight">Create Tournament</h2>
      <p className="text-muted-foreground">
        Use the button below to create a new tournament.
      </p>
      <CreateTournamentButton />
    </div>
  );
}

// Mirrors the loaded layout: heading, description line, and the create button.
function CreateTournamentSkeleton() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <Skeleton className="h-9 w-72" />
      <Skeleton className="h-5 w-80 max-w-full" />
      <Skeleton className="h-9 w-44" />
    </div>
  );
}
