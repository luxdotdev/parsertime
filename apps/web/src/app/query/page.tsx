import { DashboardLayout } from "@/components/dashboard-layout";
import { QueryBuilder } from "@/components/query-builder/query-builder";
import { Skeleton } from "@/components/ui/skeleton";
import { auth } from "@/lib/auth";
import { queryBuilder } from "@/lib/flags";
import { getFlag } from "@/lib/flags-helpers";
import { getMetadataTranslations } from "@/lib/metadata-i18n";
import { getViewableTeams, listSavedQueries } from "@/lib/query-builder/server";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

export function generateMetadata(): Metadata {
  const t = getMetadataTranslations("queryBuilderPage.metadata");
  return { title: t("title"), description: t("description") };
}

// Static shell: the dashboard chrome prerenders, and the flag/auth/DB work
// streams into ONE boundary whose fallback mirrors QueryBuilder's own frame —
// so navigation shows a single, stable skeleton that the builder replaces in
// place.
export default function QueryPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<QueryBuilderSkeleton />}>
        <QueryPageContent />
      </Suspense>
    </DashboardLayout>
  );
}

async function QueryPageContent() {
  const enabled = await getFlag(queryBuilder);
  if (!enabled) notFound();

  const session = await auth();
  if (!session?.user?.email) redirect("/");

  const [teams, savedQueries, t] = await Promise.all([
    getViewableTeams(),
    listSavedQueries(),
    getTranslations("queryBuilderPage"),
  ]);

  if (teams.length === 0) {
    return (
      <div className="px-6 pt-8 pb-16 sm:px-10">
        <header className="border-border border-b pb-6">
          <h1 className="text-4xl leading-none font-semibold tracking-tight">
            {t("title")}
          </h1>
          <p className="text-muted-foreground mt-3 max-w-2xl text-sm">
            {t("subtitle")}
          </p>
        </header>
        <div className="border-border mt-8 flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-20 text-center">
          <p className="text-foreground text-base font-medium">
            {t("noAccessTitle")}
          </p>
          <p className="text-muted-foreground mt-1 max-w-md text-sm">
            {t("noAccessBody")}
          </p>
        </div>
      </div>
    );
  }

  return <QueryBuilder teams={teams} savedQueries={savedQueries} />;
}

// Mirrors QueryBuilder's frame (header with eyebrow/title/subtitle and action
// row, the ask/build card, the output section) so the streamed builder
// replaces this in place with no jump.
function QueryBuilderSkeleton() {
  return (
    <div className="px-6 pt-8 pb-16 sm:px-10">
      <header className="border-border flex flex-wrap items-end justify-between gap-x-10 gap-y-4 border-b pb-6">
        <div>
          <Skeleton className="h-3 w-32" />
          <Skeleton className="mt-3 h-9 w-52" />
          <Skeleton className="mt-3 h-4 w-80" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-14" />
        </div>
      </header>

      <div className="mt-8 space-y-10">
        <div className="border-border bg-card ring-foreground/5 overflow-hidden rounded-xl border shadow-xs ring-1">
          <div className="space-y-2.5 p-4 sm:p-5">
            <Skeleton className="h-3 w-8" />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
              <Skeleton className="h-16 flex-1" />
              <Skeleton className="h-9 w-28" />
            </div>
          </div>

          <div className="border-border bg-muted/20 space-y-3 border-t p-4 sm:p-5">
            <Skeleton className="h-3 w-14" />
            <div className="flex flex-wrap gap-2">
              {["a", "b", "c", "d", "e"].map((k) => (
                <Skeleton key={k} className="h-8 w-24 rounded-md" />
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {["f", "g", "h", "i"].map((k) => (
                <Skeleton key={k} className="h-8 w-20 rounded-md" />
              ))}
            </div>
          </div>
        </div>

        <section className="space-y-4">
          <div className="mb-5 flex flex-col gap-1">
            <Skeleton className="h-2.5 w-14" />
          </div>

          <div className="border-border flex gap-6 border-b pb-2.5">
            {["a", "b", "c"].map((k) => (
              <Skeleton key={k} className="h-3 w-12" />
            ))}
          </div>

          <div className="border-border mt-2 flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-16 text-center">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-2 h-3 w-64" />
          </div>
        </section>
      </div>
    </div>
  );
}
