import { BlacklistManager } from "@/components/team-ops/blacklist-manager";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { auth } from "@/lib/auth";
import { canManageTeam } from "@/lib/auth";
import {
  listBlacklist,
  getBlacklistSuggestions,
} from "@/lib/team-ops/blacklist";
import type { PagePropsWithLocale } from "@/types/next";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

export async function generateMetadata(
  props: PagePropsWithLocale<"/[team]/ops">
): Promise<Metadata> {
  const params = await props.params;
  const t = await getTranslations({
    locale: params.locale,
    namespace: "teamOps",
  });

  return {
    title: t("title"),
  };
}

export default async function TeamOpsPage(
  props: PagePropsWithLocale<"/[team]/ops">
) {
  const params = await props.params;
  const session = await auth();

  if (!session?.user?.email) {
    notFound();
  }

  const user = await AppRuntime.runPromise(
    UserService.pipe(Effect.flatMap((svc) => svc.getUser(session.user.email)))
  );
  if (!user) {
    notFound();
  }

  const teamId = parseInt(params.team);
  if (isNaN(teamId)) {
    notFound();
  }

  if (!(await canManageTeam(teamId, user))) {
    notFound();
  }

  const [rows, suggestions] = await Promise.all([
    listBlacklist(teamId),
    getBlacklistSuggestions(teamId),
  ]);

  const t = await getTranslations({
    locale: params.locale,
    namespace: "teamOps",
  });

  return (
    <DashboardLayout>
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {t("blacklist.subtitle")}
            </p>
          </div>
        </div>

        {/* Blacklist section — additional sections slot in below */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">{t("blacklist.heading")}</h2>
          <BlacklistManager
            teamId={teamId}
            rows={rows}
            suggestions={suggestions}
          />
        </section>
      </div>
    </DashboardLayout>
  );
}
