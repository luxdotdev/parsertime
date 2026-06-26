import { DashboardLayout } from "@/components/dashboard-layout";
import { QueryBuilder } from "@/components/query-builder/query-builder";
import { auth } from "@/lib/auth";
import { queryBuilder } from "@/lib/flags";
import { getViewableTeams, listSavedQueries } from "@/lib/query-builder/server";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("queryBuilderPage.metadata");
  return { title: t("title"), description: t("description") };
}

export default async function QueryPage() {
  const enabled = await queryBuilder();
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
      <DashboardLayout>
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
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <QueryBuilder teams={teams} savedQueries={savedQueries} />
    </DashboardLayout>
  );
}
