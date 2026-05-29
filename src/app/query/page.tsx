import { DashboardLayout } from "@/components/dashboard-layout";
import { QueryBuilder } from "@/components/query-builder/query-builder";
import { auth } from "@/lib/auth";
import { queryBuilder } from "@/lib/flags";
import { getViewableTeams, listSavedQueries } from "@/lib/query-builder/server";
import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

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
        <div className="mx-auto w-full max-w-[1400px] flex-1 space-y-6 p-4 md:p-8">
          <header className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
            <p className="text-muted-foreground max-w-2xl text-sm">
              {t("subtitle")}
            </p>
          </header>
          <div className="border-border flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-20 text-center">
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
